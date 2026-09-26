// Che cosa si mostra alla classe sullo schermo grande.
//
// Una vista diversa sugli stessi dati: davanti a venti persone non vanno voti,
// assenze e note dei compagni. Regola: un blocco spento non produce dati. Non
// nascosti dall'interfaccia, ma assenti dal messaggio che parte verso l'altro
// pannello, così non si trovano nemmeno con gli strumenti di sviluppo. Nel
// dominio perché è una regola del registro, e si prova.

import { coloreDiVoce, testoDiVoce } from './lists.js'
import {
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
} from './calculations.js'
import { nomeTipoAttivita } from './activities.js'
import {
  avanzamentoConsegna,
  scadenzaConsegna,
  statoConsegna,
  type StatoConsegna,
} from './assignments.js'
import {
  classeDelCorsoId,
  corsoPerId,
  materiaDelCorso,
  nomeDelPiano,
  registroDelCorso,
} from './courses.js'
import {
  giorniBrevi,
  inizialiGiorno,
  mesi,
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
} from './dates.js'
import { letteraSettimana } from './years.js'
import { parole } from './words.testi.js'
import { lessico } from './lexicon.testi.js'
import { testi } from './projection.testi.js'
import type { Grafico } from './reports.js'
import { giorniMostrati, sospensioneDi } from './timetable.js'
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
  Semestre,
  StatoAttivita,
  TipoAttivita,
  TipoValutazione,
} from './models.js'

// ---------------------------------------------------------------- i blocchi

/**
 * I pezzi di registro che si possono mandare sullo schermo grande: quelli che
 * durante un'ora si finirebbe per mostrare comunque.
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
 * I blocchi che parlano dei singoli allievi: spenti finché non li si accende,
 * perché la proiezione segue il registro e aprire l'ora dopo non deve mettere
 * i voti davanti alla classe senza che nessuno l'abbia chiesto.
 */
export const BLOCCHI_RISERVATI: BloccoProiezione[] = ['valutazioni', 'documenti', 'appello']

export const BLOCCHI_PREDEFINITI: BloccoProiezione[] = BLOCCHI.filter(
  (b) => !BLOCCHI_RISERVATI.includes(b),
)

/**
 * Un nome per chiave, letto dal catalogo al momento: il modulo gira anche nel
 * processo principale, che sceglie e cambia la lingua dopo il caricamento.
 * Getter enumerabili, così si scorre come un oggetto qualunque.
 */
function nomiPigri<K extends string> (
  chiavi: readonly K[],
  leggi: (chiave: K) => string,
): Record<K, string> {
  const nati = {} as Record<K, string>
  for (const chiave of chiavi) {
    Object.defineProperty(nati, chiave, { enumerable: true, get: () => leggi(chiave) })
  }
  return nati
}

export const NOMI_BLOCCO: Record<BloccoProiezione, string> = nomiPigri(
  BLOCCHI,
  (blocco) => testi().blocchi[blocco],
)

export function riservato (blocco: BloccoProiezione): boolean {
  return BLOCCHI_RISERVATI.includes(blocco)
}

// -------------------------------------------------------- le viste del calendario

/**
 * Come si guarda il calendario sullo schermo grande: le stesse quattro viste
 * del registro, quattro domande diverse (settimana, mese, anno, agenda). Il
 * giorno è quello che il docente guarda nel registro, e lo segue.
 */
type VistaCalendario = 'agenda' | 'settimana' | 'mese' | 'anno'

export const VISTE_CALENDARIO: VistaCalendario[] = ['settimana', 'mese', 'anno', 'agenda']

export const NOMI_VISTA_CALENDARIO: Record<VistaCalendario, string> = nomiPigri(
  VISTE_CALENDARIO,
  (vista) => ({ settimana: parole().settimana, mese: parole().mese, ...testi().viste })[vista],
)

export function vistaCalendarioValida (valore: unknown): valore is VistaCalendario {
  return typeof valore === 'string' && VISTE_CALENDARIO.includes(valore as VistaCalendario)
}

// ----------------------------------------------------------------- la mira

/**
 * Dove sta guardando il registro, inviato dal pannello principale a ogni
 * cambio di vista. Sono riferimenti, non dati: si rilegge sempre dall'archivio,
 * così le correzioni arrivano anche sullo schermo.
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
   * I blocchi resi disponibili: le schede che esistono. Per i blocchi riservati
   * servono due gesti, accenderli qui e poi aprirli.
   */
  blocchi: BloccoProiezione[]
  /**
   * La scheda aperta: una alla volta, a tutto schermo, perché si legga dal
   * fondo dell'aula. Null se nessun blocco è acceso.
   */
  aperto: BloccoProiezione | null
  /**
   * Se accanto a voti e documenti mancanti ci vanno i nomi. Spento, una prova
   * si vede come distribuzione; l'appello li mostra sempre.
   */
  nomi: boolean
  /**
   * Lo schermo in pausa: il contenuto si spegne senza chiudere la finestra né
   * perdere il posto.
   */
  sospesa: boolean
  /**
   * Misure strette: caratteri più piccoli e meno aria. Accese di partenza: la
   * pagina non scorre, e quel che finisce sotto il bordo non lo legge nessuno.
   * Si allargano per le aule lunghe con poche righe da leggere.
   */
  compatta: boolean
  /**
   * La vista del calendario, quando è la scheda aperta. Sta qui e non nella
   * mira: si può lavorare sulla settimana e proiettare il mese. Il giorno
   * invece segue la mira.
   */
  calendario: VistaCalendario
}

export const PROIEZIONE_PREDEFINITA: ImpostazioniProiezione = {
  blocchi: BLOCCHI_PREDEFINITI,
  compatta: true,
  // La scaletta: la si guarda a inizio ora, e non riguarda nessuno in particolare.
  aperto: 'scaletta',
  nomi: false,
  sospesa: false,
  // L'agenda: «che cosa viene adesso».
  calendario: 'agenda',
}

// -------------------------------------------------------------- le schede

/** Una scheda in cima allo schermo: c'è, e forse è quella aperta. */
interface SchedaProiezione {
  blocco: BloccoProiezione
  nome: string
  corrente: boolean
}

/**
 * Le schede accese nell'ordine di `BLOCCHI`, non di accensione: «la prossima»
 * è sempre la stessa.
 */
export function blocchiAccesi (impostazioni: ImpostazioniProiezione): BloccoProiezione[] {
  return BLOCCHI.filter((blocco) => impostazioni.blocchi.includes(blocco))
}

/**
 * La scheda davvero aperta: quella dichiarata se è ancora accesa, altrimenti
 * la prima. Spegnere quella guardata non lascia lo schermo vuoto.
 */
export function bloccoAperto (impostazioni: ImpostazioniProiezione): BloccoProiezione | null {
  const accesi = blocchiAccesi(impostazioni)
  if (impostazioni.aperto && accesi.includes(impostazioni.aperto)) return impostazioni.aperto
  return accesi[0] ?? null
}

/** Le schede da disegnare in cima allo schermo, con dentro quale è quella aperta. */
function schedeProiezione (impostazioni: ImpostazioniProiezione): SchedaProiezione[] {
  const aperto = bloccoAperto(impostazioni)
  return blocchiAccesi(impostazioni).map((blocco) => ({
    blocco,
    nome: NOMI_BLOCCO[blocco],
    corrente: blocco === aperto,
  }))
}

/** La scheda prima o dopo quella aperta, girando in tondo. */
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
  /**
   * La tinta del filetto, `#rrggbb` (`coloreDiVoce`), già risolta: lo schermo
   * in aula non conosce le liste.
   */
  colore: string
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
 * Un'ora dentro una griglia proiettata, con i minuti oltre agli orari scritti:
 * lo schermo deve solo moltiplicare per la scala.
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
interface ProvaProiettata {
  id: string
  titolo: string
}

/**
 * Un giorno di una griglia, uguale per settimana (colonna), mese (cella) e
 * agenda (sezione): vacanze, sabato e confine di semestre si vedono uguali.
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
 * La settimana con la sua griglia oraria. La fascia è quella delle lezioni che
 * ci sono, non della giornata teorica: tre ore in un campo dalle 7 alle 18 non
 * si leggerebbero dal fondo.
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

interface RigaMese {
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
 * Una casella del calendario annuale. `data` è null per le caselle che non
 * esistono (il 31 novembre): restano vuote perché le righe si allineino.
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

interface MeseAnno {
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
 * Il calendario mandato allo schermo nella vista scelta: le altre tre sono
 * `null`, perché quel che non si mostra non parte.
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

interface VotoProiettato {
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
   * La distribuzione da disegnare, un punto per voto sopra l'asse: la stessa
   * del PDF e del pannello.
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

interface RigaAppello {
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

interface IntestazioneProiezione {
  classe: string | null
  materia: string | null
  data: string | null
  orario: string | null
  aula: string | null
  /** Come si chiama la lezione: il nome del piano, quando ce n'è uno. */
  titolo: string | null
}

/**
 * Il pacchetto che parte verso lo schermo grande. Un blocco spento è `null`,
 * cioè davvero niente: la scelta del docente è una proprietà del messaggio.
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
 * Che cosa si sta guardando, in ordine di precisione: l'ora aperta, poi il
 * corso, altrimenti niente. Meglio uno schermo che aspetta che la classe
 * sbagliata.
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
  return allievo ? nomeCompleto(allievo) : testi().sconosciuto
}

// ------------------------------------------------------------------ i blocchi

function scalettaDi (registro: Registro, fuoco: Fuoco): TappaProiettata[] {
  const { piano, lezione } = fuoco
  if (!piano) return []
  return piano.attivita.map((attivita) => {
    // Lo stato viene dall'avanzamento dell'ora, non dal piano: la classe vuole
    // sapere dove si è arrivati.
    const avanzamento = lezione?.avanzamento.find((a) => a.attivitaId === attivita.id)
    return {
      id: attivita.id,
      titolo: attivita.titolo,
      tipo: attivita.tipo,
      // Tipo con la parola e il colore scelti nel registro, come nella scaletta.
      nomeTipo: nomeTipoAttivita(attivita.tipo, registro.impostazioni),
      colore: coloreDiVoce(registro.impostazioni, 'tipoAttivita', attivita.tipo),
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
    titolo: risorsa.titolo || risorsa.nome || testi().materiale,
    tipo: risorsa.tipo,
    url: risorsa.url,
    file: risorsa.file,
  }
}

/**
 * Le consegne che riguardano la classe: fuori quelle del docente (note a sé
 * stesso) e quelle chiuse.
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
    // Aperta: qualcuno non l'ha ancora fatta. L'elenco nomina proprio chi manca.
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
  const t = testi()
  if (consegna.a === 'classe') return t.tuttaLaClasse
  if (consegna.a === 'docente') return t.chiInsegna
  if (!nomi) return t.aPersone(consegna.allieviIds.length)
  const allievi = classe?.allievi ?? []
  return consegna.allieviIds.map((id) => nomeAllievo(allievi, id)).join(', ')
}

/**
 * Quel che sta per arrivare: prossime ore e prove del corso, in un elenco solo
 * in ordine di data.
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
  return piano ? nomeDelPiano(registro, piano) : lessico().lezione.singolare
}

// --------------------------------------------- il calendario, come nel registro

/*
 * Le quattro viste del calendario, proiettate: disposte come nel registro,
 * perché il docente indica lo schermo guardando il portatile. Qui però niente
 * si tocca né scorre: la settimana si stringe sulla fascia utile, il mese sta
 * in una pagina, l'anno è il foglio appeso al muro. Solo le lezioni del corso,
 * non quelle del docente con altre classi.
 */

/** L'anno scolastico di cui si parla: quello della classe, o quello in corso. */
function annoDelFuoco (registro: Registro, fuoco: Fuoco): AnnoScolastico | null {
  const annoId = fuoco.classe?.annoId ?? registro.annoCorrenteId
  return registro.anni.find((a) => a.id === annoId) ?? null
}

/**
 * Il confine di semestre di un giorno, in due parole: di là le medie
 * ripartono, ed è la data che gli allievi chiedono.
 */
function confineDi (anno: AnnoScolastico | null, data: Iso): string | null {
  const apre = anno?.semestri.find((s) => s.inizio === data) ?? null
  const chiude = anno?.semestri.find((s) => s.fine === data) ?? null
  const t = testi()
  // La cifra sola: l'ordinale lo scrive ogni lingua a modo suo.
  const cifra = (semestre: Semestre): string => numeroSemestre(semestre).replace(/°$/, '')
  const voci = [
    chiude ? t.fineSemestre(cifra(chiude)) : null,
    apre ? t.inizioSemestre(cifra(apre)) : null,
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
    nome: giorniBrevi()[giornoSettimana(data) - 1],
    numero: giornoDelMese(data),
    esteso: formattaData(data, 'lungo'),
    mese: mesi()[Number(data.slice(5, 7)) - 1].slice(0, 3),
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
 * La fascia oraria da disegnare: quella delle lezioni della settimana, senza
 * l'ora d'aria sopra e sotto che il registro tiene per aggiungerne.
 */
function fasciaDella (
  registro: Registro,
  giorni: GiornoProiettato[],
): { daMinuti: number, aMinuti: number } {
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

  // La parola della lista «Tipi di settimana», non il valore salvato.
  const tipo = letteraSettimana(anno, riferimento)
  return {
    numero: settimanaIso(riferimento),
    lettera: tipo ? testoDiVoce(registro.impostazioni, 'tipoSettimana', tipo) : null,
    giorni,
    daMinuti,
    aMinuti,
    ore,
  }
}

/**
 * Il mese guardato, dal lunedì che lo apre al giorno che lo chiude, con le
 * code spente del mese prima e dopo. Un mese solo: qui non si scorre.
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
        .map((data) =>
          giornoProiettato(registro, anno, fuoco, lezioni, prove, data, giorno, primo),
        ),
    })
  }

  return { colonne: visibili.map((indice) => giorniBrevi()[indice - 1]), righe }
}

/**
 * L'anno intero su una pagina, mesi in colonna e giorni in riga: vacanze,
 * settimane rimaste, ponti.
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
      // Le caselle che non esistono restano vuote: le righe si allineano fra i mesi.
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

      const data = `${mese.slice(0, 8)}${String(numero).padStart(2, '0')}`
      const settimana = giornoSettimana(data)
      giorni.push({
        data,
        iniziale: inizialiGiorno()[settimana - 1],
        // Solo sul lunedì: è la settimana a essere A o B.
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

/**
 * Se il calendario ha qualcosa da dire: un'agenda vuota no; una griglia vuota
 * sì («questa settimana abbiamo lezione?»).
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
 * Solo la vista scelta esce piena.
 */
function calendarioProiettato (
  registro: Registro,
  fuoco: Fuoco,
  mira: MiraProiezione,
  vista: VistaCalendario,
  giorno: Iso,
): CalendarioProiettato | null {
  if (!fuoco.corso) return null

  // Il giorno è quello della mira; senza, l'ora aperta; senza, oggi.
  const riferimento = mira.data ?? fuoco.lezione?.data ?? giorno
  const anno = annoDelFuoco(registro, fuoco)
  const lezioni = registroDelCorso(registro, fuoco.corso.id)
  const prove = registro.valutazioni.filter((v) => v.corsoId === fuoco.corso?.id)

  if (vista === 'agenda') {
    return {
      vista,
      giorno: riferimento,
      titolo: testi().prossimamente,
      agenda: calendarioDi(registro, fuoco, giorno),
      settimana: null,
      mese: null,
      anno: null,
    }
  }

  if (vista === 'settimana') {
    const settimana =
      settimanaProiettata(registro, anno, fuoco, lezioni, prove, riferimento, giorno)
    const estremi = settimanaDi(riferimento)
    return {
      vista,
      giorno: riferimento,
      titolo: testi().titoloSettimana(
        settimana.numero,
        formattaData(estremi[0]),
        formattaData(estremi[6]),
      ),
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
    titolo: intero ? testi().titoloAnno(intero.etichetta) : testi().viste.anno,
    agenda: null,
    settimana: null,
    mese: null,
    anno: intero,
  }
}

/**
 * I momenti di valutazione del corso, dal più recente. Senza nomi si vede come
 * è andata la classe (media, sufficienti, distribuzione); con i nomi compare
 * la colonna per allievo.
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
      voto: voto?.assente ? testi().assente : formattaVoto(voto?.valore ?? null),
      sufficiente:
        voto && voto.valore !== null && !voto.assente
          ? voto.valore >= momento.scala.sufficienza
          : null,
      assente: Boolean(voto?.assente),
    }
  })
}

/**
 * I documenti da raccogliere: il conteggio sempre, l'elenco di chi manca solo
 * con i nomi accesi.
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
 * L'appello dell'ora, per UD. I nomi ci sono sempre: serve a farsi correggere
 * dalla classe. È l'unico blocco che ignora l'interruttore dei nomi.
 */
function appelloDi (registro: Registro, fuoco: Fuoco): AppelloProiettato | null {
  const { lezione, classe } = fuoco
  if (!lezione || !classe) return null

  const ud = unitaDidattiche(lezione, registro.impostazioni.minutiUd)
  const quante = ud.length
  const allievi = ordinaAllievi(allieviAttivi(classe))

  const righe: RigaAppello[] = allievi.map((allievo) => {
    const presenza = lezione.presenze.find((p) => p.allievoId === allievo.id)
    const stati = statiAllineati(presenza, quante)
    return {
      allievoId: allievo.id,
      nome: nomeCompleto(allievo),
      sigle: stati.map(siglaPresenza),
      minuti: presenza?.minuti ?? null,
      // «Presente» qui vuol dire presente almeno per una parte dell'ora.
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
 * Il contenuto da mandare allo schermo grande, rifatto a ogni cambiamento:
 * costa poco.
 */
export function contenutoProiezione (
  registro: Registro,
  mira: MiraProiezione,
  impostazioni: ImpostazioniProiezione,
  giorno: Iso = oggi(),
): ContenutoProiezione {
  const fuoco = fuocoDi(registro, mira)
  // Solo la scheda aperta produce dati: gli altri blocchi non entrano nel
  // messaggio.
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

  // In pausa non si calcola niente: i dati non devono uscire di qui.
  if (impostazioni.sospesa) {
    return {
      intestazione,
      compatta: impostazioni.compatta,
      // Nemmeno i nomi delle schede.
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
    scaletta: acceso('scaletta') ? scalettaDi(registro, fuoco) : null,
    consegne: acceso('consegne') ? consegneDi(registro, fuoco, nomi, giorno) : null,
    calendario: acceso('calendario')
      ? calendarioProiettato(registro, fuoco, mira, impostazioni.calendario ?? 'agenda', giorno)
      : null,
    valutazioni: acceso('valutazioni')
      ? valutazioniDi(registro, fuoco, nomi, mira.semestreId)
      : null,
    documenti: acceso('documenti') ? documentiDi(registro, fuoco, nomi) : null,
    appello: acceso('appello') ? appelloDi(registro, fuoco) : null,
    sospesa: false,
    vuota: false,
  }

  // «Vuota» vuol dire non aver trovato di che cosa parlare: va detto, se no la
  // sola testata sembra un guasto.
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
