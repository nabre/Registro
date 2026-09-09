// Che cosa si mostra alla classe.
//
// La proiezione non è il registro spostato su un altro schermo: è una vista
// diversa sugli stessi dati, e la differenza è tutta qui dentro. Il registro
// tiene i voti di tutti, le assenze di tutti, le note su qualcuno; lo schermo
// grande sta davanti a venti persone che non hanno titolo per leggere quel che
// riguarda i compagni. Questo file decide che cosa esce.
//
// La regola che regge il tutto: un blocco spento non produce dati. Non «dati
// nascosti dal foglio di stile», non «dati che l'interfaccia non disegna» —
// proprio assenti dal messaggio che parte verso l'altro pannello. Chi apre gli
// strumenti di sviluppo sul webview della proiezione non trova i voti che il
// docente non ha acceso, perché non ci sono mai arrivati.
//
// Ed è codice di dominio, senza niente dell'applicazione dentro: la scelta di che cosa è
// mostrabile è una regola del registro, non un dettaglio dell'interfaccia, e si
// prova come si provano le altre.

import {
  contaUd,
  distribuzione,
  distribuzioneAPunti,
  formattaVoto,
  fineLezione,
  inizioLezione,
  lezioniDelGiorno,
  allieviAttivi,
  mediaMomento,
  nomeCompleto,
  ordinaAllievi,
  siglaPresenza,
  statiAllineati,
  unitaDidattiche,
} from './calcoli.js'
import { nomeTipoAttivita } from './attivita.js'
import {
  avanzamentoConsegna,
  scadenzaConsegna,
  statoConsegna,
  type StatoConsegna,
} from './consegne.js'
import {
  classeDelCorsoId,
  corsoPerId,
  materiaDelCorso,
  nomeDelPiano,
  registroDelCorso,
} from './corsi.js'
import {
  GIORNI_BREVI,
  MESI,
  formattaData,
  formattaMese,
  formattaUd,
  giornoDelMese,
  giornoSettimana,
  inizioSettimana,
  minutiDaOra,
  oggi,
  numeroSemestre,
  oraDaMinuti,
  primoDelMese,
  settimanaDi,
  settimanaIso,
  sommaGiorni,
  sommaMesi,
  ultimoDelMese,
} from './date.js'
import { letteraSettimana } from './anni.js'
import type { Grafico } from './rapporti.js'
import { sospensioneDi } from './orario.js'
import type {
  Allievo,
  AnnoScolastico,
  Classe,
  Consegna,
  Corso,
  Iso,
  LetteraSettimana,
  Lezione,
  MomentoValutazione,
  PianoLezione,
  Registro,
  Risorsa,
  StatoAttivita,
  TipoAttivita,
  TipoValutazione,
} from './modelli.js'

// ---------------------------------------------------------------- i blocchi

/**
 * I pezzi di registro che si possono mandare sullo schermo grande.
 *
 * Sette, e non è un elenco arbitrario: sono le cose che durante un'ora si
 * finisce per far vedere comunque, girando il portatile o riscrivendole alla
 * lavagna.
 */
export type BloccoProiezione =
  | 'scaletta'
  | 'argomenti'
  | 'consegne'
  | 'calendario'
  | 'valutazioni'
  | 'documenti'
  | 'appello'

export const BLOCCHI: BloccoProiezione[] = [
  'scaletta',
  'argomenti',
  'consegne',
  'calendario',
  'valutazioni',
  'documenti',
  'appello',
]

/**
 * I blocchi che parlano dei singoli allievi.
 *
 * Restano spenti finché non li si accende. Non è un divieto — il docente li
 * accende quando servono, ed è una scelta sua — ma la proiezione segue quel che
 * si sta guardando nel registro: senza questa partenza, aprire l'ora
 * successiva mentre lo schermo è acceso metterebbe i voti dell'ultima verifica
 * davanti alla classe senza che nessuno l'abbia chiesto.
 */
export const BLOCCHI_RISERVATI: BloccoProiezione[] = ['valutazioni', 'documenti', 'appello']

export const BLOCCHI_PREDEFINITI: BloccoProiezione[] = BLOCCHI.filter(
  (b) => !BLOCCHI_RISERVATI.includes(b),
)

export const NOMI_BLOCCO: Record<BloccoProiezione, string> = {
  scaletta: 'Scaletta',
  argomenti: 'Argomenti',
  consegne: 'Consegne',
  calendario: 'Calendario',
  valutazioni: 'Valutazioni',
  documenti: 'Documenti',
  appello: 'Appello',
}

export function riservato (blocco: BloccoProiezione): boolean {
  return BLOCCHI_RISERVATI.includes(blocco)
}

// -------------------------------------------------------- le viste del calendario

/**
 * Come si guarda il calendario sullo schermo grande.
 *
 * Le stesse quattro del registro, e non è una comodità: sono quattro domande
 * diverse, e la classe se le fa tutte. «Che ore abbiamo questa settimana» si
 * legge sulla griglia, «quando cade la verifica» sul mese, «quanto manca alle
 * vacanze» sull'anno, «che cosa viene adesso» sull'agenda. Un elenco solo —
 * quel che c'era prima — rispondeva bene alla quarta e male alle altre tre.
 *
 * Il giorno attorno a cui girano è quello che il docente sta guardando nel
 * registro: si scorre la settimana sul portatile e la settimana proiettata la
 * segue, senza un secondo comando.
 */
export type VistaCalendario = 'agenda' | 'settimana' | 'mese' | 'anno'

export const VISTE_CALENDARIO: VistaCalendario[] = ['settimana', 'mese', 'anno', 'agenda']

export const NOMI_VISTA_CALENDARIO: Record<VistaCalendario, string> = {
  settimana: 'Settimana',
  mese: 'Mese',
  anno: 'Anno',
  agenda: 'Agenda',
}

export function vistaCalendarioValida (valore: unknown): valore is VistaCalendario {
  return typeof valore === 'string' && VISTE_CALENDARIO.includes(valore as VistaCalendario)
}

// ----------------------------------------------------------------- la mira

/**
 * Dove sta guardando il registro.
 *
 * La manda il pannello principale a ogni cambio di vista, e da qui si ricava
 * l'ora di cui si parla. Sono riferimenti e non dati: quel che si proietta lo
 * si rilegge sempre dall'archivio, così una correzione fatta mentre lo schermo
 * è acceso arriva anche là.
 */
export interface MiraProiezione {
  lezioneId: string | null
  corsoId: string | null
  classeId: string | null
  semestreId: string | null
  /** Il giorno mostrato nel calendario: vale quando non c'è un'ora aperta. */
  data: Iso | null
}

export const MIRA_VUOTA: MiraProiezione = {
  lezioneId: null,
  corsoId: null,
  classeId: null,
  semestreId: null,
  data: null,
}

/** Che cosa mostrare, e come. */
export interface ImpostazioniProiezione {
  /**
   * I blocchi che il docente ha reso disponibili: sono le schede che esistono.
   *
   * Non è quel che si vede — sullo schermo ne sta una sola — ma quel che si
   * può mettere sullo schermo senza toccare altro. La distinzione conta per i
   * blocchi riservati: perché i voti finiscano davanti alla classe bisogna
   * accenderli qui e poi aprirli, che sono due gesti, non uno.
   */
  blocchi: BloccoProiezione[]
  /**
   * La scheda aperta: quel che la classe sta guardando adesso.
   *
   * Una alla volta, come le schede di un raccoglitore. Prima si impilavano
   * tutte sulla stessa pagina: con quattro blocchi accesi il proiettore
   * mostrava quattro riquadri rimpiccioliti, e la classe in fondo all'aula non
   * leggeva nessuno dei quattro. Uno alla volta usa tutto lo schermo per la
   * cosa di cui si sta parlando, che è il solo motivo per cui il proiettore è
   * acceso.
   *
   * Null quando non c'è niente da mostrare — nessun blocco acceso.
   */
  aperto: BloccoProiezione | null
  /**
   * Se accanto ai voti e ai documenti mancanti ci vanno i nomi.
   *
   * Spento, un momento di valutazione si vede come distribuzione — media,
   * quanti sufficienti, come sono andati i voti — che è quel che si commenta
   * alla classe restituendo una verifica. Acceso, si vede la colonna dei nomi.
   * L'appello non lo guarda: un appello senza nomi non è un appello.
   */
  nomi: boolean
  /**
   * Lo schermo in pausa. Serve nel mezzo dell'ora, quando si passa a scrivere
   * qualcosa che non deve essere letto: si spegne il contenuto senza chiudere
   * la finestra e senza perdere il posto.
   */
  sospesa: boolean
  /**
   * Misure strette: caratteri più piccoli e meno aria attorno.
   *
   * Accesa di partenza, ed è la scelta giusta per quasi tutte le aule. Il
   * contenuto sta in una pagina che non scorre — davanti a una classe nessuno
   * può scorrere — e quel che non ci sta non lo legge nessuno. Con le misure
   * larghe una scaletta di sei tappe o un appello di venticinque nomi
   * finiscono sotto il bordo: meglio un carattere un po' più piccolo e tutto
   * visibile, che uno grande e mezzo fuori.
   *
   * Si allarga per le aule lunghe, dove l'ultima fila è a dieci metri e le
   * righe da leggere sono poche.
   */
  compatta: boolean
  /**
   * Come si guarda il calendario, quando è la scheda aperta.
   *
   * Sta qui e non nella mira perché è una scelta di che cosa mostrare, non di
   * dove si sta guardando: capita di lavorare sulla settimana e di proiettare
   * il mese, perché si sta spiegando quando cade la verifica, e le due cose
   * non devono muoversi insieme. Il giorno, quello sì, lo segue: viene dalla
   * mira, e scorrendo il calendario sul portatile scorre anche quello che la
   * classe ha davanti.
   */
  calendario: VistaCalendario
}

export const PROIEZIONE_PREDEFINITA: ImpostazioniProiezione = {
  blocchi: BLOCCHI_PREDEFINITI,
  compatta: true,
  // La scaletta: è quel che si guarda all'inizio dell'ora, ed è il blocco che
  // non riguarda nessuno in particolare.
  aperto: 'scaletta',
  nomi: false,
  sospesa: false,
  // L'agenda: risponde alla domanda che la classe fa più spesso — «che cosa
  // viene adesso» — ed è quel che il blocco calendario ha sempre mostrato.
  calendario: 'agenda',
}

// -------------------------------------------------------------- le schede

/** Una scheda in cima allo schermo: c'è, e forse è quella aperta. */
export interface SchedaProiezione {
  blocco: BloccoProiezione
  nome: string
  corrente: boolean
}

/**
 * Le schede accese, nell'ordine dichiarato.
 *
 * Nell'ordine di `BLOCCHI` e non in quello in cui le si è accese: è l'ordine
 * in cui la classe le vede scorrere, e cambiarlo a seconda dei clic vorrebbe
 * dire che «la prossima» non è sempre la stessa.
 */
export function blocchiAccesi (impostazioni: ImpostazioniProiezione): BloccoProiezione[] {
  return BLOCCHI.filter((blocco) => impostazioni.blocchi.includes(blocco))
}

/**
 * La scheda davvero aperta.
 *
 * Quella dichiarata, se è ancora accesa; altrimenti la prima che c'è. Spegnere
 * il blocco che si stava guardando non deve lasciare lo schermo vuoto davanti
 * alla classe: si scivola su quello dopo senza che nessuno debba dirlo.
 */
export function bloccoAperto (impostazioni: ImpostazioniProiezione): BloccoProiezione | null {
  const accesi = blocchiAccesi(impostazioni)
  if (impostazioni.aperto && accesi.includes(impostazioni.aperto)) return impostazioni.aperto
  return accesi[0] ?? null
}

/** Le schede da disegnare in cima allo schermo, con dentro quale è quella aperta. */
export function schedeProiezione (impostazioni: ImpostazioniProiezione): SchedaProiezione[] {
  const aperto = bloccoAperto(impostazioni)
  return blocchiAccesi(impostazioni).map((blocco) => ({
    blocco,
    nome: NOMI_BLOCCO[blocco],
    corrente: blocco === aperto,
  }))
}

/**
 * La scheda prima o dopo quella aperta, girando in tondo.
 *
 * In tondo perché le schede accese sono tre o quattro: arrivati in fondo, la
 * cosa che si vuole è tornare alla prima, non trovarsi un pulsante che smette
 * di funzionare.
 */
export function bloccoScorrendo (
  impostazioni: ImpostazioniProiezione,
  verso: 1 | -1,
): BloccoProiezione | null {
  const accesi = blocchiAccesi(impostazioni)
  if (accesi.length === 0) return null
  const aperto = bloccoAperto(impostazioni)
  const dove = aperto ? accesi.indexOf(aperto) : 0
  return accesi[(dove + verso + accesi.length) % accesi.length]
}

// -------------------------------------------------------------- il contenuto

export interface RisorsaProiettata {
  id: string
  titolo: string
  tipo: Risorsa['tipo']
  url?: string
  /** Percorso relativo alla cartella dei dati: la compone il webview con la sua radice. */
  file?: string
}

export interface TappaProiettata {
  id: string
  titolo: string
  tipo: TipoAttivita
  nomeTipo: string
  durata: string
  descrizione?: string
  /** Quel che serve in aula: fotocopie, righello, la postazione del laboratorio. */
  materiali?: string
  stato: StatoAttivita
  risorse: RisorsaProiettata[]
  /** Vero quando la tappa è una prova: la classe deve vederlo arrivare. */
  valutata: boolean
}

export interface ConsegnaProiettata {
  id: string
  testo: string
  tipo: Consegna['tipo']
  /** Per quando, già scritta: 'lun 15 settembre 2026' o null se non ha termine. */
  scadenza: string | null
  scadenzaIso: Iso | null
  stato: StatoConsegna
  /** A chi tocca, detto senza nomi quando i nomi sono spenti. */
  a: string
  note?: string
}

export interface VoceCalendario {
  id: string
  data: string
  dataIso: Iso
  orario: string | null
  /** 'lezione' o 'prova': le due cose che alla classe interessa vedere arrivare. */
  genere: 'lezione' | 'prova'
  titolo: string
  /** L'ora che si sta facendo adesso, se è fra queste. */
  corrente: boolean
}

/**
 * Un'ora dentro una griglia proiettata.
 *
 * Porta i minuti oltre agli orari scritti: la settimana disegna rettangoli, e
 * il conto di dove comincia e dove finisce un blocco è aritmetica sul giorno,
 * non formattazione. Farlo qui vuol dire che lo schermo grande non ha altro da
 * fare che moltiplicare per la scala.
 */
export interface OraProiettata {
  id: string
  titolo: string
  inizio: string | null
  fine: string | null
  daMinuti: number | null
  aMinuti: number | null
  stato: Lezione['stato']
  /** L'ora che si sta facendo adesso. */
  corrente: boolean
}

/** Una prova nel giorno: un momento di valutazione non ha un'ora sua. */
export interface ProvaProiettata {
  id: string
  titolo: string
}

/**
 * Un giorno di una griglia: quel che c'è dentro, e che giorno è.
 *
 * Le tre viste a griglia se lo passano uguale — la settimana ci disegna una
 * colonna, il mese una cella, l'agenda una sezione — perché è lo stesso
 * giorno: le vacanze, il sabato e il confine di semestre si vedono uguali
 * dappertutto, come nel registro.
 */
export interface GiornoProiettato {
  data: Iso
  /** 'lun' */
  nome: string
  /** Il numero del mese. */
  numero: number
  /** 'lunedì 12 ottobre 2026': l'agenda ne fa una testata. */
  esteso: string
  /** Il mese abbreviato: nel mese il primo del mese si dice per esteso. */
  mese: string
  /** Il primo del mese: nella griglia è il confine fra due mesi. */
  apreMese: boolean
  /** Fuori dal mese guardato: le code della griglia mensile. */
  fuori: boolean
  oggi: boolean
  /** Sabato e domenica: giorni veri, ma non giorni di scuola. */
  festivo: boolean
  /** Il nome della chiusura, quando il giorno è sospeso. */
  chiuso: string | null
  /** 'inizio 2°', 'fine 1°': il confine dove le medie ripartono. */
  semestre: string | null
  ore: OraProiettata[]
  prove: ProvaProiettata[]
}

/**
 * La settimana con la sua griglia oraria.
 *
 * La fascia è quella delle lezioni che ci sono, non quella teorica della
 * giornata: proiettare dalle sette alle diciotto per tre ore di lezione vuol
 * dire tre rettangolini in mezzo a un campo vuoto, e da in fondo all'aula non
 * si legge niente.
 */
export interface SettimanaProiettata {
  numero: number
  lettera: LetteraSettimana | null
  giorni: GiornoProiettato[]
  /** La fascia da disegnare, in minuti da mezzanotte. */
  daMinuti: number
  aMinuti: number
  /** Le ore piene da segnare a sinistra, con i loro minuti. */
  ore: Array<{ minuti: number; etichetta: string }>
}

export interface RigaMese {
  /** Il numero della settimana: il piano annuale si conta in settimane. */
  numero: number
  lettera: LetteraSettimana | null
  giorni: GiornoProiettato[]
}

export interface MeseProiettato {
  /** I nomi brevi delle colonne, nell'ordine dei giorni mostrati. */
  colonne: string[]
  righe: RigaMese[]
}

/**
 * Una casella del calendario annuale.
 *
 * `data` è null per le caselle che non esistono — il 31 di novembre — che
 * restano vuote invece di sparire: le righe devono restare allineate fra i
 * mesi, o il calendario smette di leggersi in orizzontale.
 */
export interface GiornoAnno {
  data: Iso | null
  /** 'L', 'M', 'M': l'iniziale, come sui calendari appesi al muro. */
  iniziale: string
  /** La lettera della settimana, solo sul lunedì: è la settimana a essere A o B. */
  lettera: LetteraSettimana | null
  chiuso: string | null
  festivo: boolean
  oggi: boolean
  /** Un semestre comincia qui: riga sopra. */
  apre: boolean
  /** Un semestre finisce qui: riga sotto. */
  chiude: boolean
  /** Quante ore del corso cadono in quel giorno. */
  ore: number
}

export interface MeseAnno {
  /** 'ottobre' */
  titolo: string
  /** Trentuno caselle, comprese quelle che non esistono. */
  giorni: GiornoAnno[]
}

export interface AnnoProiettato {
  etichetta: string
  mesi: MeseAnno[]
}

/**
 * Il calendario mandato allo schermo, nella vista che il docente ha scelto.
 *
 * Una sola delle quattro è piena: le altre sono `null`, e vale la regola di
 * tutto il file — quel che non si mostra non parte. Proiettare la settimana
 * non deve mandare al proiettore l'anno intero «per non doverlo ricalcolare».
 */
export interface CalendarioProiettato {
  vista: VistaCalendario
  /** Il giorno attorno a cui gira quel che si mostra. */
  giorno: Iso
  /** 'settimana 42 · 12–18 ottobre', 'ottobre 2026', '2026/2027'. */
  titolo: string
  agenda: VoceCalendario[] | null
  settimana: SettimanaProiettata | null
  mese: MeseProiettato | null
  anno: AnnoProiettato | null
}

export interface VotoProiettato {
  nome: string
  voto: string
  sufficiente: boolean | null
  assente: boolean
}

export interface ValutazioneProiettata {
  id: string
  titolo: string
  tipo: TipoValutazione
  data: string
  dataIso: Iso
  peso: number
  /** Quanti voti ci sono, su quanti allievi. */
  espressi: number
  attesi: number
  media: string
  sufficienti: number
  insufficienti: number
  /**
   * La distribuzione da disegnare: un punto per voto, sopra l'asse della
   * scala. È quella che si commenta alla lavagna.
   *
   * Già pronta e non le cifre grezze: la stessa che finisce sul PDF e nel
   * pannello, così la forma che si mostra alla classe e quella che il docente
   * riguarda dopo sono lo stesso disegno.
   */
  grafico: Grafico
  /** Da dove in su è sufficiente: serve a chi legge, non al disegno. */
  sufficienza: number
  /** Solo con i nomi accesi: la colonna per allievo. */
  voti: VotoProiettato[] | null
}

export interface DocumentoProiettato {
  id: string
  testo: string
  scadenza: string | null
  consegnati: number
  attesi: number
  /** Solo con i nomi accesi: chi non l'ha ancora portato. */
  mancano: string[] | null
}

export interface RigaAppello {
  allievoId: string
  nome: string
  /** Una sigla per unità didattica, nell'ordine dell'ora. */
  sigle: string[]
  minuti: number | null
  presente: boolean
}

export interface AppelloProiettato {
  /** Le fasce orarie delle UD: l'intestazione della griglia. */
  colonne: Array<{ indice: number; inizio: string; fine: string }>
  righe: RigaAppello[]
  presenti: number
  totale: number
}

export interface IntestazioneProiezione {
  classe: string | null
  materia: string | null
  data: string | null
  orario: string | null
  aula: string | null
  /** Come si chiama la lezione: il nome del piano, quando ce n'è uno. */
  titolo: string | null
}

/**
 * Il pacchetto che parte verso lo schermo grande.
 *
 * Ogni blocco è `null` quando è spento, e `null` vuol dire davvero niente: né
 * l'elenco vuoto né i dati messi da parte. È il punto in cui la scelta del
 * docente diventa una proprietà del messaggio invece che una regola che
 * l'interfaccia deve ricordarsi di rispettare.
 */
export interface ContenutoProiezione {
  intestazione: IntestazioneProiezione
  /** Misure strette: lo schermo lo sa perché è lui a disegnarsi. */
  compatta: boolean
  /** Le schede accese, per la striscia in cima: la classe sa dove si è. */
  schede: SchedaProiezione[]
  argomenti: { argomenti: string | null; materiali: string | null } | null
  scaletta: TappaProiettata[] | null
  consegne: ConsegnaProiettata[] | null
  calendario: CalendarioProiettato | null
  valutazioni: ValutazioneProiettata[] | null
  documenti: DocumentoProiettato[] | null
  appello: AppelloProiettato | null
  /** In pausa: lo schermo mostra il segnaposto e nient'altro. */
  sospesa: boolean
  /** Non c'è un'ora da mostrare: la proiezione dice che aspetta. */
  vuota: boolean
}

// ------------------------------------------------------------------ il fuoco

/** L'ora di cui parla la proiezione, e il corso e la classe che ne discendono. */
interface Fuoco {
  lezione: Lezione | null
  corso: Corso | null
  classe: Classe | null
  piano: PianoLezione | null
}

/**
 * Che cosa si sta guardando, in ordine di precisione.
 *
 * Un'ora aperta vince su tutto: è il caso normale, si insegna e si proietta la
 * lezione che si sta facendo. Senza, si ripiega sul corso — la classe vede il
 * suo calendario e le sue consegne — e in mancanza anche di quello si resta a
 * mani vuote, che è meglio di indovinare: uno schermo che mostra la classe
 * sbagliata è peggio di uno schermo che aspetta.
 */
function fuocoDi (registro: Registro, mira: MiraProiezione): Fuoco {
  const lezione = mira.lezioneId
    ? registro.lezioni.find((l) => l.id === mira.lezioneId) ?? null
    : null
  const corsoId = lezione?.corsoId ?? mira.corsoId ?? null
  const corso = corsoPerId(registro, corsoId)
  const classe = corso
    ? classeDelCorsoId(registro, corso.id)
    : mira.classeId
      ? registro.classi.find((c) => c.id === mira.classeId) ?? null
      : null
  const piano = lezione?.pianoId
    ? registro.piani.find((p) => p.id === lezione.pianoId) ?? null
    : null
  return { lezione, corso, classe, piano }
}

function orarioDi (lezione: Lezione | null): string | null {
  if (!lezione) return null
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  if (!inizio) return null
  return fine ? `${inizio} – ${fine}` : inizio
}

function nomeAllievo (allievi: Allievo[], id: string): string {
  const allievo = allievi.find((a) => a.id === id)
  return allievo ? nomeCompleto(allievo) : 'sconosciuto'
}

// ------------------------------------------------------------------ i blocchi

function scalettaDi (fuoco: Fuoco): TappaProiettata[] {
  const { piano, lezione } = fuoco
  if (!piano) return []
  return piano.attivita.map((attivita) => {
    // Lo stato viene dall'ora, non dal piano: il piano dice quel che si voleva
    // fare, l'avanzamento quel che si è fatto, e alla classe interessa il
    // secondo — è il segno di dove siamo arrivati.
    const avanzamento = lezione?.avanzamento.find((a) => a.attivitaId === attivita.id)
    return {
      id: attivita.id,
      titolo: attivita.titolo,
      tipo: attivita.tipo,
      nomeTipo: nomeTipoAttivita(attivita.tipo),
      durata: formattaUd(attivita.durataUd),
      descrizione: attivita.descrizione,
      materiali: attivita.materiali,
      stato: avanzamento?.stato ?? 'da-fare',
      risorse: attivita.risorse.map(risorsaProiettata),
      valutata: Boolean(attivita.valutazione),
    }
  })
}

function risorsaProiettata (risorsa: Risorsa): RisorsaProiettata {
  return {
    id: risorsa.id,
    titolo: risorsa.titolo || risorsa.nome || 'materiale',
    tipo: risorsa.tipo,
    url: risorsa.url,
    file: risorsa.file,
  }
}

/**
 * Le consegne che riguardano la classe.
 *
 * Quelle di chi insegna restano fuori: «preparare le fotocopie» è una nota del
 * docente a sé stesso, e sullo schermo sarebbe soltanto rumore. Le chiuse
 * nemmeno: una consegna chiusa è una cosa finita, e l'elenco davanti alla
 * classe deve dire che cosa c'è ancora da fare.
 */
function consegneDi (
  registro: Registro,
  fuoco: Fuoco,
  nomi: boolean,
  giorno: Iso,
): ConsegnaProiettata[] {
  const { corso, classe } = fuoco
  if (!corso) return []
  return registro.consegne
    .filter((c) => c.corsoId === corso.id)
    // Aperta vuol dire che qualcuno non l'ha ancora fatta: non c'è più una
    // chiusura della consegna intera, e non serviva — l'elenco davanti alla
    // classe deve nominare proprio quelli che mancano.
    .filter((c) => c.a !== 'docente' && !avanzamentoConsegna(c, classe).completa)
    .map((consegna) => {
      const scadenza = scadenzaConsegna(registro, consegna)
      return {
        id: consegna.id,
        testo: consegna.testo,
        tipo: consegna.tipo,
        scadenza: scadenza ? formattaData(scadenza, 'lungo') : null,
        scadenzaIso: scadenza,
        stato: statoConsegna(registro, consegna, classe, giorno),
        a: destinatariDetti(consegna, classe, nomi),
        note: consegna.note,
      }
    })
    .sort((a, b) => (a.scadenzaIso ?? '9999').localeCompare(b.scadenzaIso ?? '9999'))
}

function destinatariDetti (consegna: Consegna, classe: Classe | null, nomi: boolean): string {
  if (consegna.a === 'classe') return 'tutta la classe'
  if (consegna.a === 'docente') return 'chi insegna'
  if (!nomi) {
    const quanti = consegna.allieviIds.length
    return quanti === 1 ? 'a una persona' : `a ${quanti} persone`
  }
  const allievi = classe?.allievi ?? []
  return consegna.allieviIds.map((id) => nomeAllievo(allievi, id)).join(', ')
}

/**
 * Quel che sta per arrivare: le prossime ore del corso e le prossime prove.
 *
 * Mescolate in un elenco solo e in ordine di data, perché è così che le vive
 * chi le subisce: «giovedì lezione, martedì prossimo la verifica» è una frase
 * sola, e due elenchi accanto costringono a rifare il confronto a mente.
 */
function calendarioDi (registro: Registro, fuoco: Fuoco, giorno: Iso): VoceCalendario[] {
  const { corso, lezione } = fuoco
  if (!corso) return []

  const lezioni: VoceCalendario[] = registroDelCorso(registro, corso.id)
    .filter((l) => l.data >= giorno && l.stato !== 'annullata')
    .slice(0, 6)
    .map((l) => ({
      id: l.id,
      data: formattaData(l.data, 'lungo'),
      dataIso: l.data,
      orario: orarioDi(l),
      genere: 'lezione' as const,
      titolo: l.argomenti?.trim() || nomeLezione(registro, l),
      corrente: l.id === lezione?.id,
    }))

  const prove: VoceCalendario[] = registro.valutazioni
    .filter((v) => v.corsoId === corso.id && v.data >= giorno)
    .map((v) => ({
      id: v.id,
      data: formattaData(v.data, 'lungo'),
      dataIso: v.data,
      orario: null,
      genere: 'prova' as const,
      titolo: v.titolo,
      corrente: false,
    }))

  return [...lezioni, ...prove]
    .sort((a, b) => a.dataIso.localeCompare(b.dataIso))
    .slice(0, 8)
}

/** Come si chiama un'ora che non ha argomenti scritti: il piano, o la data. */
function nomeLezione (registro: Registro, lezione: Lezione): string {
  const piano = lezione.pianoId
    ? registro.piani.find((p) => p.id === lezione.pianoId) ?? null
    : null
  return piano ? nomeDelPiano(registro, piano) : 'lezione'
}

// --------------------------------------------- il calendario, come nel registro

/*
 * Le quattro viste del calendario, proiettate.
 *
 * Sono le stesse del registro, e la somiglianza non è un vezzo: il docente
 * indica lo schermo mentre parla — «qui, giovedì» — e se la griglia proiettata
 * fosse disposta diversamente da quella che ha sul portatile, indicherebbe un
 * punto che sul suo schermo sta da un'altra parte. Stesse settimane in colonna,
 * stessi giorni spenti, stesso confine di semestre.
 *
 * Quel che cambia è che qui non si tocca niente e non si scorre: la settimana
 * si stringe sulla fascia oraria che serve davvero, il mese sta in una pagina,
 * l'anno è il foglio appeso al muro. Niente trascinamenti, niente menu, niente
 * «mostra altre trenta»: davanti a una classe nessuno può scorrere, e quel che
 * finisce sotto il bordo non lo legge nessuno.
 *
 * Le lezioni sono quelle del corso, non quelle del docente. Il calendario di
 * chi insegna dice anche dov'è alla terza ora di martedì con l'altra classe, e
 * quello non riguarda chi sta guardando.
 */

/** L'anno scolastico di cui si parla: quello della classe, o quello in corso. */
function annoDelFuoco (registro: Registro, fuoco: Fuoco): AnnoScolastico | null {
  const annoId = fuoco.classe?.annoId ?? registro.annoCorrenteId
  return registro.anni.find((a) => a.id === annoId) ?? null
}

/** I giorni della settimana che si disegnano: quelli configurati, o lunedì–venerdì. */
function giorniMostrati (registro: Registro): number[] {
  const scelti = registro.impostazioni.giorniVisibili
  return scelti.length > 0 ? [...scelti].sort((a, b) => a - b) : [1, 2, 3, 4, 5]
}

/** '1°', '2°': nella cella non c'è spazio per l'etichetta intera. */
/**
 * Il confine di semestre che cade in un giorno, detto in due parole.
 *
 * È la riga più importante dell'anno: di là le medie ripartono, e una verifica
 * messa il giorno prima o il giorno dopo finisce in due pagelle diverse. Nel
 * calendario del registro si vede, e sullo schermo della classe pure — è
 * proprio la data che gli allievi chiedono.
 */
function confineDi (anno: AnnoScolastico | null, data: Iso): string | null {
  const apre = anno?.semestri.find((s) => s.inizio === data) ?? null
  const chiude = anno?.semestri.find((s) => s.fine === data) ?? null
  const voci = [
    chiude ? `fine ${numeroSemestre(chiude)}` : null,
    apre ? `inizio ${numeroSemestre(apre)}` : null,
  ].filter((v): v is string => v !== null)
  return voci.length > 0 ? voci.join(' · ') : null
}

function oraProiettata (registro: Registro, lezione: Lezione, corrente: boolean): OraProiettata {
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  return {
    id: lezione.id,
    titolo: lezione.argomenti?.trim() || nomeLezione(registro, lezione),
    inizio,
    fine,
    daMinuti: inizio ? minutiDaOra(inizio) : null,
    aMinuti: fine ? minutiDaOra(fine) : null,
    stato: lezione.stato,
    corrente,
  }
}

/** Quel che si sa di un giorno, uguale per tutte e tre le griglie. */
function giornoProiettato (
  registro: Registro,
  anno: AnnoScolastico | null,
  fuoco: Fuoco,
  lezioni: Lezione[],
  prove: MomentoValutazione[],
  data: Iso,
  giorno: Iso,
  mese: Iso | null,
): GiornoProiettato {
  return {
    data,
    nome: GIORNI_BREVI[giornoSettimana(data) - 1],
    numero: giornoDelMese(data),
    esteso: formattaData(data, 'lungo'),
    mese: MESI[Number(data.slice(5, 7)) - 1].slice(0, 3),
    apreMese: giornoDelMese(data) === 1,
    fuori: mese !== null && data.slice(0, 7) !== mese.slice(0, 7),
    oggi: data === giorno,
    festivo: giornoSettimana(data) >= 6,
    chiuso: sospensioneDi(anno, data)?.etichetta ?? null,
    semestre: confineDi(anno, data),
    ore: lezioniDelGiorno(lezioni, data).map((l) =>
      oraProiettata(registro, l, l.id === fuoco.lezione?.id),
    ),
    prove: prove.filter((v) => v.data === data).map((v) => ({ id: v.id, titolo: v.titolo })),
  }
}

/** Sotto tre ore la griglia non si legge più: si tiene comunque questa finestra. */
const FASCIA_MINIMA = 180

/**
 * La fascia oraria da disegnare: quella delle lezioni della settimana.
 *
 * Non quella teorica della giornata. Proiettare dalle sette alle diciotto per
 * tre ore di lezione vuol dire tre rettangolini in mezzo a un campo vuoto, e da
 * in fondo all'aula non si legge nessuno dei tre. Nel registro la fascia si
 * allarga di un'ora sopra e sotto — serve spazio per aggiungerne una — ma qui
 * non si aggiunge niente, e quell'aria è solo contenuto rimpicciolito.
 */
function fasciaDella (registro: Registro, giorni: GiornoProiettato[]): { daMinuti: number, aMinuti: number } {
  let da: number | null = null
  let a: number | null = null
  for (const giorno of giorni) {
    for (const ora of giorno.ore) {
      if (ora.daMinuti === null || ora.aMinuti === null) continue
      da = da === null ? ora.daMinuti : Math.min(da, ora.daMinuti)
      a = a === null ? ora.aMinuti : Math.max(a, ora.aMinuti)
    }
  }

  let daMinuti =
    da === null ? minutiDaOra(registro.impostazioni.oraInizioGiornata) : Math.floor(da / 60) * 60
  let aMinuti =
    a === null ? minutiDaOra(registro.impostazioni.oraFineGiornata) : Math.ceil(a / 60) * 60

  if (aMinuti - daMinuti < FASCIA_MINIMA) aMinuti = Math.min(24 * 60, daMinuti + FASCIA_MINIMA)
  if (aMinuti - daMinuti < FASCIA_MINIMA) daMinuti = Math.max(0, aMinuti - FASCIA_MINIMA)
  return { daMinuti, aMinuti }
}

function settimanaProiettata (
  registro: Registro,
  anno: AnnoScolastico | null,
  fuoco: Fuoco,
  lezioni: Lezione[],
  prove: MomentoValutazione[],
  riferimento: Iso,
  giorno: Iso,
): SettimanaProiettata {
  const visibili = giorniMostrati(registro)
  const giorni = settimanaDi(riferimento)
    .filter((data) => visibili.includes(giornoSettimana(data)))
    .map((data) => giornoProiettato(registro, anno, fuoco, lezioni, prove, data, giorno, null))

  const { daMinuti, aMinuti } = fasciaDella(registro, giorni)
  const ore: Array<{ minuti: number, etichetta: string }> = []
  for (let minuti = Math.ceil(daMinuti / 60) * 60; minuti <= aMinuti; minuti += 60) {
    ore.push({ minuti, etichetta: oraDaMinuti(minuti) })
  }

  return {
    numero: settimanaIso(riferimento),
    lettera: letteraSettimana(anno, riferimento),
    giorni,
    daMinuti,
    aMinuti,
    ore,
  }
}

/**
 * Il mese guardato, dal lunedì che lo apre al giorno che lo chiude.
 *
 * Un mese solo e non la striscia infinita del registro: quella serve a chi
 * programma e scorre, e qui nessuno scorre. Le code — gli ultimi giorni del
 * mese prima, i primi di quello dopo — restano, spente: senza, la prima
 * settimana comincerebbe a mezz'aria.
 */
function meseProiettato (
  registro: Registro,
  anno: AnnoScolastico | null,
  fuoco: Fuoco,
  lezioni: Lezione[],
  prove: MomentoValutazione[],
  riferimento: Iso,
  giorno: Iso,
): MeseProiettato {
  const visibili = giorniMostrati(registro)
  const primo = primoDelMese(riferimento)
  const ultimo = ultimoDelMese(riferimento)
  const righe: RigaMese[] = []

  for (let lunedi = inizioSettimana(primo); lunedi <= ultimo; lunedi = sommaGiorni(lunedi, 7)) {
    righe.push({
      numero: settimanaIso(lunedi),
      lettera: letteraSettimana(anno, lunedi),
      giorni: settimanaDi(lunedi)
        .filter((data) => visibili.includes(giornoSettimana(data)))
        .map((data) => giornoProiettato(registro, anno, fuoco, lezioni, prove, data, giorno, primo)),
    })
  }

  return { colonne: visibili.map((indice) => GIORNI_BREVI[indice - 1]), righe }
}

/**
 * L'anno intero su una pagina: i mesi in colonna, i giorni in riga.
 *
 * È il calendario che la sede stampa e appende, ed è la vista che risponde
 * alle domande che la classe fa a settembre e a gennaio: quando sono le
 * vacanze, quante settimane mancano, dove cade il ponte. Nessuna delle altre
 * tre le regge — bisogna vedere l'anno tutto insieme.
 */
function annoProiettato (
  anno: AnnoScolastico | null,
  lezioni: Lezione[],
  giorno: Iso,
): AnnoProiettato | null {
  if (!anno) return null

  const mesi: MeseAnno[] = []
  for (let mese = primoDelMese(anno.inizio); mese <= anno.fine; mese = sommaMesi(mese, 1)) {
    const ultimo = giornoDelMese(ultimoDelMese(mese))
    const giorni: GiornoAnno[] = []

    for (let numero = 1; numero <= 31; numero += 1) {
      // Le caselle che non esistono — il 31 di novembre — restano vuote invece
      // di sparire: le righe devono restare allineate fra i mesi, o il
      // calendario smette di leggersi in orizzontale.
      if (numero > ultimo) {
        giorni.push({
          data: null,
          iniziale: '',
          lettera: null,
          chiuso: null,
          festivo: false,
          oggi: false,
          apre: false,
          chiude: false,
          ore: 0,
        })
        continue
      }

      const data = `${mese.slice(0, 8)}${String(numero).padStart(2, '0')}` as Iso
      const settimana = giornoSettimana(data)
      giorni.push({
        data,
        iniziale: INIZIALI_GIORNO[settimana - 1],
        // Sul lunedì soltanto: è la settimana a essere A o B, e ripeterla su
        // sette caselle la farebbe leggere come una proprietà del giorno.
        lettera: settimana === 1 ? letteraSettimana(anno, data) : null,
        chiuso: sospensioneDi(anno, data)?.etichetta ?? null,
        festivo: settimana >= 6,
        oggi: data === giorno,
        apre: anno.semestri.some((s) => s.inizio === data),
        chiude: anno.semestri.some((s) => s.fine === data),
        ore: lezioniDelGiorno(lezioni, data).filter((l) => l.stato !== 'annullata').length,
      })
    }

    mesi.push({ titolo: formattaMese(mese).split(' ')[0], giorni })
  }

  return { etichetta: anno.etichetta, mesi }
}

/** L'iniziale del giorno della settimana, come sui calendari appesi al muro. */
const INIZIALI_GIORNO = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

/**
 * Se il calendario ha qualcosa da dire.
 *
 * L'agenda vuota non è niente da mostrare; una griglia vuota sì che lo è — una
 * settimana senza lezioni, detta con i suoi giorni e le sue vacanze, risponde
 * proprio alla domanda «questa settimana abbiamo lezione?».
 */
function calendarioPieno (calendario: CalendarioProiettato | null): boolean {
  if (!calendario) return false
  if (calendario.vista === 'agenda') return (calendario.agenda?.length ?? 0) > 0
  if (calendario.vista === 'settimana') return (calendario.settimana?.giorni.length ?? 0) > 0
  if (calendario.vista === 'mese') return (calendario.mese?.righe.length ?? 0) > 0
  return (calendario.anno?.mesi.length ?? 0) > 0
}

/**
 * Il calendario nella vista scelta, attorno al giorno che il registro guarda.
 *
 * Una sola delle quattro esce piena: le altre restano `null`, ed è la regola di
 * tutto il file applicata dentro un blocco solo — proiettare la settimana non
 * manda al proiettore l'anno intero «per non doverlo ricalcolare».
 */
function calendarioProiettato (
  registro: Registro,
  fuoco: Fuoco,
  mira: MiraProiezione,
  vista: VistaCalendario,
  giorno: Iso,
): CalendarioProiettato | null {
  if (!fuoco.corso) return null

  // Il giorno di riferimento è quello che il registro sta guardando: si scorre
  // la settimana sul portatile e la settimana proiettata la segue. Senza una
  // mira si sta sull'ora aperta, e in mancanza anche di quella su oggi.
  const riferimento = mira.data ?? fuoco.lezione?.data ?? giorno
  const anno = annoDelFuoco(registro, fuoco)
  const lezioni = registroDelCorso(registro, fuoco.corso.id)
  const prove = registro.valutazioni.filter((v) => v.corsoId === fuoco.corso?.id)

  if (vista === 'agenda') {
    return {
      vista,
      giorno: riferimento,
      titolo: 'Prossimamente',
      agenda: calendarioDi(registro, fuoco, giorno),
      settimana: null,
      mese: null,
      anno: null,
    }
  }

  if (vista === 'settimana') {
    const settimana = settimanaProiettata(registro, anno, fuoco, lezioni, prove, riferimento, giorno)
    const estremi = settimanaDi(riferimento)
    return {
      vista,
      giorno: riferimento,
      titolo: `Settimana ${settimana.numero} · ${formattaData(estremi[0])} – ${formattaData(estremi[6])}`,
      agenda: null,
      settimana,
      mese: null,
      anno: null,
    }
  }

  if (vista === 'mese') {
    return {
      vista,
      giorno: riferimento,
      titolo: formattaMese(riferimento),
      agenda: null,
      settimana: null,
      mese: meseProiettato(registro, anno, fuoco, lezioni, prove, riferimento, giorno),
      anno: null,
    }
  }

  const intero = annoProiettato(anno, lezioni, giorno)
  return {
    vista,
    giorno: riferimento,
    titolo: intero ? `Anno ${intero.etichetta}` : 'Anno',
    agenda: null,
    settimana: null,
    mese: null,
    anno: intero,
  }
}

/**
 * I momenti di valutazione del corso, dal più recente.
 *
 * Senza i nomi si vede come è andata la classe: media, sufficienti, la
 * distribuzione per fascia. È la restituzione che si fa a voce riconsegnando
 * una verifica, e non dice niente di nessuno in particolare. Con i nomi accesi
 * compare la colonna per allievo — la si accende sapendo che cosa comparirà.
 */
function valutazioniDi (
  registro: Registro,
  fuoco: Fuoco,
  nomi: boolean,
  semestreId: string | null,
): ValutazioneProiettata[] {
  const { corso, classe } = fuoco
  if (!corso) return []

  const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
  const semestre = anno?.semestri.find((s) => s.id === semestreId) ?? null
  const allievi = classe ? ordinaAllievi(allieviAttivi(classe)) : []

  return registro.valutazioni
    .filter((v) => v.corsoId === corso.id)
    .filter((v) => !semestre || (v.data >= semestre.inizio && v.data <= semestre.fine))
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 6)
    .map((momento) => valutazioneProiettata(momento, allievi, nomi))
}

function valutazioneProiettata (
  momento: MomentoValutazione,
  allievi: Allievo[],
  nomi: boolean,
): ValutazioneProiettata {
  const conti = distribuzione(momento)
  return {
    id: momento.id,
    titolo: momento.titolo,
    tipo: momento.tipo,
    data: formattaData(momento.data, 'lungo'),
    dataIso: momento.data,
    peso: momento.peso,
    espressi: conti.conteggio,
    attesi: allievi.length,
    media: formattaVoto(mediaMomento(momento)),
    sufficienti: conti.sufficienti,
    insufficienti: conti.insufficienti,
    grafico: distribuzioneAPunti(momento),
    sufficienza: momento.scala.sufficienza,
    voti: nomi ? votiProiettati(momento, allievi) : null,
  }
}

function votiProiettati (momento: MomentoValutazione, allievi: Allievo[]): VotoProiettato[] {
  return allievi.map((allievo) => {
    const voto = momento.voti.find((v) => v.allievoId === allievo.id) ?? null
    return {
      nome: nomeCompleto(allievo),
      voto: voto?.assente ? 'assente' : formattaVoto(voto?.valore ?? null),
      sufficiente:
        voto && voto.valore !== null && !voto.assente
          ? voto.valore >= momento.scala.sufficienza
          : null,
      assente: Boolean(voto?.assente),
    }
  })
}

/**
 * I documenti da raccogliere: quanti sono arrivati, e chi manca.
 *
 * Il conteggio si può proiettare sempre — «diciotto su ventidue» non dice di
 * chi si parla — mentre l'elenco di chi manca è il nome di quattro persone
 * davanti a tutti, e compare solo con i nomi accesi.
 */
function documentiDi (
  registro: Registro,
  fuoco: Fuoco,
  nomi: boolean,
): DocumentoProiettato[] {
  const { corso, classe } = fuoco
  if (!corso) return []
  const allievi = classe?.allievi ?? []

  return registro.consegne
    .filter(
      (c) => c.corsoId === corso.id && c.documento && !avanzamentoConsegna(c, classe).completa,
    )
    .map((consegna) => {
      const avanzamento = avanzamentoConsegna(consegna, classe)
      const scadenza = scadenzaConsegna(registro, consegna)
      return {
        id: consegna.id,
        testo: consegna.testo,
        scadenza: scadenza ? formattaData(scadenza, 'lungo') : null,
        consegnati: avanzamento.fatte,
        attesi: avanzamento.destinatari.length,
        mancano: nomi ? avanzamento.mancano.map((chi) => nomeAllievo(allievi, chi)) : null,
      }
    })
    .sort((a, b) => a.testo.localeCompare(b.testo, 'it'))
}

/**
 * L'appello dell'ora, con la griglia per unità didattica.
 *
 * I nomi ci sono sempre: un appello proiettato serve proprio a farsi correggere
 * dalla classe — «io c'ero, sono arrivato alla seconda» — e senza i nomi non
 * correggerebbe niente. È l'unico blocco che ignora l'interruttore dei nomi, e
 * lo fa apposta.
 */
function appelloDi (fuoco: Fuoco): AppelloProiettato | null {
  const { lezione, classe } = fuoco
  if (!lezione || !classe) return null

  const ud = unitaDidattiche(lezione)
  const quante = contaUd(lezione)
  const allievi = ordinaAllievi(allieviAttivi(classe))

  const righe: RigaAppello[] = allievi.map((allievo) => {
    const presenza = lezione.presenze.find((p) => p.allievoId === allievo.id)
    const stati = statiAllineati(presenza, quante)
    return {
      allievoId: allievo.id,
      nome: nomeCompleto(allievo),
      sigle: stati.map(siglaPresenza),
      minuti: presenza?.minuti ?? null,
      // «Presente» per l'intestazione vuol dire «c'è per almeno un pezzo
      // dell'ora»: chi arriva alla seconda UD non va contato fra gli assenti.
      presente: stati.some((s) => s === 'presente' || s === 'ritardo'),
    }
  })

  return {
    colonne: ud.map((u) => ({ indice: u.indice, inizio: u.inizio, fine: u.fine })),
    righe,
    presenti: righe.filter((r) => r.presente).length,
    totale: righe.length,
  }
}

// ------------------------------------------------------------------ il tutto

/**
 * Il contenuto da mandare allo schermo grande.
 *
 * Si rifà da capo a ogni cambiamento — del registro o di dove si sta guardando
 * — ed è abbastanza poco lavoro da non doverlo evitare: un piano ha dieci
 * tappe, una classe venticinque nomi.
 */
export function contenutoProiezione (
  registro: Registro,
  mira: MiraProiezione,
  impostazioni: ImpostazioniProiezione,
  giorno: Iso = oggi(),
): ContenutoProiezione {
  const fuoco = fuocoDi(registro, mira)
  // Solo la scheda aperta produce dati. Gli altri blocchi non sono «nascosti
  // dal foglio di stile»: non entrano proprio nel messaggio che parte, ed è la
  // stessa regola di prima applicata più stretta — adesso ne esce uno solo.
  const aperto = bloccoAperto(impostazioni)
  const acceso = (blocco: BloccoProiezione) => blocco === aperto
  const nomi = impostazioni.nomi
  const schede = schedeProiezione(impostazioni)

  const intestazione: IntestazioneProiezione = {
    classe: fuoco.classe?.nome ?? null,
    materia: materiaDelCorso(registro, fuoco.corso)?.nome ?? fuoco.corso?.titolo ?? null,
    data: fuoco.lezione ? formattaData(fuoco.lezione.data, 'lungo') : null,
    orario: orarioDi(fuoco.lezione),
    aula: fuoco.lezione?.aula ?? null,
    titolo: fuoco.piano ? nomeDelPiano(registro, fuoco.piano) : null,
  }

  // In pausa non si calcola niente: il messaggio che parte è vuoto, e sullo
  // schermo resta il segnaposto. Non è una questione di velocità — è che
  // durante la pausa i dati non devono nemmeno uscire di qui.
  if (impostazioni.sospesa) {
    return {
      intestazione,
      compatta: impostazioni.compatta,
      // Nemmeno i nomi delle schede: in pausa lo schermo non dice niente di
      // che cosa il docente stia guardando.
      schede: [],
      argomenti: null,
      scaletta: null,
      consegne: null,
      calendario: null,
      valutazioni: null,
      documenti: null,
      appello: null,
      sospesa: true,
      vuota: false,
    }
  }

  const argomenti =
    acceso('argomenti') && fuoco.lezione
      ? {
          argomenti: fuoco.lezione.argomenti?.trim() || null,
          materiali: fuoco.lezione.materiali?.trim() || null,
        }
      : null

  const contenuto: ContenutoProiezione = {
    intestazione,
    compatta: impostazioni.compatta,
    schede,
    argomenti,
    scaletta: acceso('scaletta') ? scalettaDi(fuoco) : null,
    consegne: acceso('consegne') ? consegneDi(registro, fuoco, nomi, giorno) : null,
    calendario: acceso('calendario')
      ? calendarioProiettato(registro, fuoco, mira, impostazioni.calendario ?? 'agenda', giorno)
      : null,
    valutazioni: acceso('valutazioni')
      ? valutazioniDi(registro, fuoco, nomi, mira.semestreId)
      : null,
    documenti: acceso('documenti') ? documentiDi(registro, fuoco, nomi) : null,
    appello: acceso('appello') ? appelloDi(fuoco) : null,
    sospesa: false,
    vuota: false,
  }

  // «Vuota» non è «senza blocchi accesi»: è non aver trovato di che cosa
  // parlare. Con la classe davanti conviene dirlo — uno schermo che mostra la
  // testata di una lezione e nient'altro sembra un guasto.
  contenuto.vuota =
    !fuoco.corso ||
    aperto === null ||
    (!contenuto.argomenti?.argomenti &&
      !contenuto.scaletta?.length &&
      !contenuto.consegne?.length &&
      !calendarioPieno(contenuto.calendario) &&
      !contenuto.valutazioni?.length &&
      !contenuto.documenti?.length &&
      !contenuto.appello)

  return contenuto
}
