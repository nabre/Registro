// Dove si guarda, in un valore solo: la pagina, il suo soggetto (l'ora, la
// classe, il corso…) e per le impostazioni la scheda. Puro, senza stato né DOM:
// lo leggono lo stato (che ci si sposta), la storia (che lo ricorda) e la
// memoria per documento (che lo ritrova). Le regole di ripiego che prima
// stavano sparse (corso aperto, classe del fascicolo, classe della pagina
// Classi, classe dell'allievo, riconvalida dei ricordati, contesto
// dell'elemento) stanno qui con la stessa semantica, col registro per parametro.

import type { Vista } from '../../contract/protocollo.js'
import type {
  AnnoScolastico,
  Classe,
  Corso,
  Iso,
  Lezione,
  Registro,
  Semestre,
} from '../../core/dominio/models.js'
import { corsiDellAnno, registroDelCorso } from '../../core/dominio/courses.js'
import { isoValida, semestreDi } from '../../core/dominio/dates.js'
import { confrontaNomi } from '../../core/dominio/text.js'
import { annoInUso } from '../../core/dominio/years.js'

// ------------------------------------------------------------------ tipi

/**
 * Gli id delle destinazioni: quelli di `PAGINE` in `pages.ts`, più le due che
 * non hanno voce nella barra (`NASCOSTE`). Sono nomi stabili: li cerca la
 * palette e li ricorda la memoria.
 */
export type PaginaId =
  | 'pagina.oggi'
  | 'pagina.calendario'
  | 'pagina.pendenze'
  | 'pagina.daSmistare'
  | 'pagina.classi'
  | 'pagina.persone'
  | 'pagina.mappa'
  | 'pagina.corsi'
  | 'pagina.corso.registro'
  | 'pagina.corso.valutazioni'
  | 'pagina.corso.check'
  | 'pagina.corso.piani'
  | 'pagina.corso.documenti'
  | 'pagina.classe.check'
  | 'pagina.classe.documenti'
  | 'pagina.classe.assenze'
  | 'pagina.classe.messaggistica'
  | 'pagina.impostazioni'
  | 'pagina.guida'
  | 'pagina.allievo'
  | 'pagina.classe.pendenze'

/** Le destinazioni senza voce nella barra: ci si arriva da un elemento. */
export const NASCOSTE: readonly PaginaId[] = ['pagina.allievo', 'pagina.classe.pendenze']

type TipoSoggetto = 'corso' | 'classe' | 'lezione' | 'allievo' | 'piano' | 'valutazione'

/** Di che cosa è la pagina: un elemento del registro, per tipo e id. */
export interface Soggetto {
  tipo: TipoSoggetto;
  id: string;
}

// Le sezioni delle impostazioni stanno qui e non in `state.ts`, che le
// importerà: il posto non deve dipendere dallo stato.
type SchedaProgramma = 'aspetto' | 'posta' | 'modelli' | 'aggiornamenti' | 'condotto'

const SCHEDE_PROGRAMMA: readonly SchedaProgramma[] = [
  'aspetto', 'posta', 'modelli', 'aggiornamenti', 'condotto',
]

type SchedaDocumento =
  | 'anno' | 'calendario' | 'ics' | 'valutazione' | 'materie' | 'liste' | 'intestazione' | 'file'

const SCHEDE_DOCUMENTO: readonly SchedaDocumento[] = [
  'anno', 'calendario', 'ics', 'valutazione', 'materie', 'liste', 'intestazione', 'file',
]

/** La sezione delle impostazioni, col suo ambito davanti: vale solo lì. */
export type Scheda = `programma.${SchedaProgramma}` | `documento.${SchedaDocumento}`

export interface Posto {
  pagina: PaginaId;
  soggetto?: Soggetto;
  scheda?: Scheda;
}

/**
 * L'ultimo scelto per ogni tipo: resta appiccicato cambiando pagina, così
 * tornando al Registro si ritrova il corso di prima.
 */
export interface Contesto {
  corsoId: string | null;
  classeId: string | null;
  /** Il filtro per classe delle pagine di corso. */
  filtroClasseId: string | null;
  lezioneId: string | null;
  pianoId: string | null;
  valutazioneId: string | null;
  allievoId: string | null;
}

/**
 * Le preferenze del documento che il posto legge e può spostare: il periodo
 * (per il corso aperto e l'ora di riferimento), il giorno e il filtro
 * dell'agenda (che un'ora nascosta sposta sul suo corso).
 */
interface PreferenzeDoc {
  giorno?: Iso;
  semestreId?: string | null;
  filtroCorsoAgendaId?: string | null;
}

/** I campi di navigazione dello stato di prima, come li leggono le viste. */
interface CampiVista {
  vista: Vista;
  paginaId: string | null;
  ambitoCheck?: 'corso' | 'classe';
  schedaDocente?: 'todo' | 'documenti' | 'assenze' | 'messaggistica';
  ambitoImpostazioni?: 'programma' | 'documento';
  schedaProgramma?: SchedaProgramma;
  schedaDocumento?: SchedaDocumento;
}

/**
 * Lo stato di prima, o un JSON ricordato da una versione precedente: tutto
 * facoltativo e non fidato.
 */
interface CampiVecchi {
  vista?: unknown;
  paginaId?: unknown;
  ambitoCheck?: unknown;
  schedaDocente?: unknown;
  ambitoImpostazioni?: unknown;
  schedaProgramma?: unknown;
  schedaDocumento?: unknown;
  corsoId?: unknown;
  classeId?: unknown;
  lezioneId?: unknown;
  pianoId?: unknown;
  valutazioneId?: unknown;
  allievoId?: unknown;
}

// ------------------------------------------------------------------ tabella

/** La vista che disegna ogni pagina: la tabella che traduce il posto nello stato di prima. */
export const VISTA_DELLA_PAGINA: Readonly<Record<PaginaId, Vista>> = {
  'pagina.oggi': 'oggi',
  'pagina.calendario': 'calendario',
  'pagina.pendenze': 'todo',
  'pagina.daSmistare': 'daSmistare',
  'pagina.classi': 'classi',
  'pagina.persone': 'persone',
  'pagina.mappa': 'mappa',
  'pagina.corsi': 'corsi',
  'pagina.corso.registro': 'lezione',
  'pagina.corso.valutazioni': 'valutazioni',
  'pagina.corso.check': 'check',
  'pagina.corso.piani': 'piani',
  'pagina.corso.documenti': 'documenti',
  'pagina.classe.check': 'check',
  'pagina.classe.documenti': 'docenteClasse',
  'pagina.classe.assenze': 'docenteClasse',
  'pagina.classe.messaggistica': 'docenteClasse',
  'pagina.impostazioni': 'impostazioni',
  'pagina.guida': 'guida',
  'pagina.allievo': 'allievo',
  'pagina.classe.pendenze': 'docenteClasse',
}

/** Le schede del docente di classe: ognuna è una pagina a sé. */
const PAGINA_DELLA_SCHEDA_DOCENTE = {
  todo: 'pagina.classe.pendenze',
  documenti: 'pagina.classe.documenti',
  assenze: 'pagina.classe.assenze',
  messaggistica: 'pagina.classe.messaggistica',
} as const satisfies Record<NonNullable<CampiVista['schedaDocente']>, PaginaId>

/** I tipi di soggetto che ogni pagina accetta; il primo è quello che le serve. */
const SOGGETTI: Readonly<Record<PaginaId, readonly TipoSoggetto[]>> = {
  'pagina.oggi': [],
  'pagina.calendario': ['lezione'],
  'pagina.pendenze': ['corso', 'classe'],
  'pagina.daSmistare': [],
  'pagina.classi': ['classe'],
  'pagina.persone': [],
  'pagina.mappa': [],
  'pagina.corsi': ['corso'],
  'pagina.corso.registro': ['lezione', 'corso'],
  'pagina.corso.valutazioni': ['valutazione', 'corso'],
  'pagina.corso.check': ['corso'],
  'pagina.corso.piani': ['piano', 'corso'],
  'pagina.corso.documenti': ['corso'],
  'pagina.classe.check': ['classe'],
  'pagina.classe.documenti': ['classe'],
  'pagina.classe.assenze': ['classe'],
  'pagina.classe.messaggistica': ['classe'],
  'pagina.impostazioni': [],
  'pagina.guida': [],
  'pagina.allievo': ['allievo'],
  'pagina.classe.pendenze': ['classe'],
}

function paginaValida (pagina: unknown): pagina is PaginaId {
  return typeof pagina === 'string' && Object.hasOwn(VISTA_DELLA_PAGINA, pagina)
}

/** Le pagine del registro del corso: senza un corso non hanno niente da mostrare. */
function diCorso (pagina: PaginaId): boolean {
  return pagina.startsWith('pagina.corso.')
}

/** Le pagine del docente di classe: esistono solo con almeno una docenza. */
function diClasse (pagina: PaginaId): boolean {
  return pagina.startsWith('pagina.classe.')
}

/**
 * La scheda, se è ancora una di quelle che esistono. `recapiti` è dentro
 * «Comunicazioni», che ha l'id della posta; i `modelli` del documento sono
 * rimasti la carta intestata.
 */
function schedaValida (scheda: unknown): Scheda | undefined {
  if (scheda === 'programma.recapiti') return 'programma.posta'
  if (scheda === 'documento.modelli') return 'documento.intestazione'
  if (typeof scheda !== 'string') return undefined
  const [ambito, nome] = scheda.split('.')
  if (ambito === 'programma' && SCHEDE_PROGRAMMA.includes(nome as SchedaProgramma)) return scheda as Scheda
  if (ambito === 'documento' && SCHEDE_DOCUMENTO.includes(nome as SchedaDocumento)) return scheda as Scheda
  return undefined
}

/**
 * Il posto di una vista del protocollo (`naviga`, `vista.apri`, la palette),
 * con l'elemento da aprire. Col registro, un id di classe dove si aspetta un
 * corso (pendenze, check) apre il lato della classe. Le impostazioni senza
 * scheda si lasciano a chi ricorda l'ultima.
 */
export function postoDaVista (vista: Vista, elementoId?: string, registro?: Registro): Posto {
  const con = (pagina: PaginaId, tipo: TipoSoggetto): Posto =>
    elementoId ? { pagina, soggetto: { tipo, id: elementoId } } : { pagina }
  const eClasse = elementoId !== undefined &&
    registro?.classi.some((c) => c.id === elementoId) === true
  switch (vista) {
    case 'oggi': return { pagina: 'pagina.oggi' }
    case 'calendario': return con('pagina.calendario', 'lezione')
    case 'todo': return con('pagina.pendenze', eClasse ? 'classe' : 'corso')
    case 'daSmistare': return { pagina: 'pagina.daSmistare' }
    case 'lezione': return con('pagina.corso.registro', 'lezione')
    case 'classi': return con('pagina.classi', 'classe')
    case 'persone': return { pagina: 'pagina.persone' }
    case 'allievo': return con('pagina.allievo', 'allievo')
    case 'docenteClasse': return con('pagina.classe.pendenze', 'classe')
    case 'corsi': return con('pagina.corsi', 'corso')
    case 'piani': return con('pagina.corso.piani', 'piano')
    case 'valutazioni': return con('pagina.corso.valutazioni', 'valutazione')
    case 'check': return eClasse ? con('pagina.classe.check', 'classe') : con('pagina.corso.check', 'corso')
    case 'documenti': return { pagina: 'pagina.corso.documenti' }
    case 'mappa': return { pagina: 'pagina.mappa' }
    case 'guida': return { pagina: 'pagina.guida' }
    case 'impostazioni': return { pagina: 'pagina.impostazioni' }
    // Gli alias stanno solo qui: fuori dalla tabella nessuno li conosce.
    case 'modelli': return { pagina: 'pagina.impostazioni', scheda: 'documento.intestazione' }
    case 'modelliLinguistici': return { pagina: 'pagina.impostazioni', scheda: 'programma.modelli' }
  }
}

/**
 * I campi di prima che dicono la pagina: la vista e, dove una vista fa più
 * pagine, ambito o scheda. `paginaId` è `null` per le pagine senza voce.
 */
export function derivaVista (posto: Posto): CampiVista {
  const vista = VISTA_DELLA_PAGINA[posto.pagina]
  const campi: CampiVista = {
    vista,
    paginaId: NASCOSTE.includes(posto.pagina) ? null : posto.pagina,
  }
  if (vista === 'check') {
    campi.ambitoCheck = posto.pagina === 'pagina.classe.check' ? 'classe' : 'corso'
  }
  if (vista === 'docenteClasse') {
    const voce = Object.entries(PAGINA_DELLA_SCHEDA_DOCENTE)
      .find(([, pagina]) => pagina === posto.pagina)
    campi.schedaDocente = voce?.[0] as CampiVista['schedaDocente']
  }
  if (vista === 'impostazioni' && posto.scheda) {
    const [ambito, nome] = posto.scheda.split('.') as ['programma' | 'documento', string]
    campi.ambitoImpostazioni = ambito
    if (ambito === 'programma') campi.schedaProgramma = nome as SchedaProgramma
    else campi.schedaDocumento = nome as SchedaDocumento
  }
  return campi
}

/** Un id ricordato, se lo è davvero. */
function id (valore: unknown): string | null {
  return typeof valore === 'string' && valore !== '' ? valore : null
}

/**
 * Il posto dello stato di prima: per l'adattatore finché le viste scrivono i
 * campi vecchi, e per la memoria scritta da una versione precedente. Comanda
 * la vista, con ambito e scheda: `paginaId` non aggiunge niente (ogni vista
 * con i suoi campi fa una pagina sola) e può essere rimasto di un'altra vista.
 * Il soggetto è l'id del tipo che la pagina mostra; se non c'è, `completa`.
 */
export function postoDaVecchi (vecchi: CampiVecchi): Posto {
  const vista = vecchi.vista
  if (vista === 'modelli') return { pagina: 'pagina.impostazioni', scheda: 'documento.intestazione' }
  if (vista === 'modelliLinguistici') return { pagina: 'pagina.impostazioni', scheda: 'programma.modelli' }
  if (vista === 'impostazioni') {
    // I predefiniti sono quelli con cui lo stato di prima convalidava.
    const ambito = vecchi.ambitoImpostazioni === 'programma' ? 'programma' : 'documento'
    const nome = ambito === 'programma' ? vecchi.schedaProgramma : vecchi.schedaDocumento
    const scheda = schedaValida(`${ambito}.${String(nome)}`) ??
      (ambito === 'programma' ? 'programma.aspetto' : 'documento.anno')
    return { pagina: 'pagina.impostazioni', scheda }
  }

  let pagina: PaginaId
  if (vista === 'check') {
    pagina = vecchi.ambitoCheck === 'classe' ? 'pagina.classe.check' : 'pagina.corso.check'
  } else if (vista === 'docenteClasse') {
    const scheda = vecchi.schedaDocente
    pagina = typeof scheda === 'string' && Object.hasOwn(PAGINA_DELLA_SCHEDA_DOCENTE, scheda)
      ? PAGINA_DELLA_SCHEDA_DOCENTE[scheda as keyof typeof PAGINA_DELLA_SCHEDA_DOCENTE]
      : 'pagina.classe.pendenze'
  } else {
    const trovata = (Object.keys(VISTA_DELLA_PAGINA) as PaginaId[])
      .find((p) => VISTA_DELLA_PAGINA[p] === vista)
    // Una vista che non esiste più riapre sulla Dashboard, come lo stato di prima.
    pagina = trovata ?? 'pagina.oggi'
  }

  const ids: Record<TipoSoggetto, string | null> = {
    corso: id(vecchi.corsoId),
    classe: id(vecchi.classeId),
    lezione: id(vecchi.lezioneId),
    allievo: id(vecchi.allievoId),
    piano: id(vecchi.pianoId),
    valutazione: id(vecchi.valutazioneId),
  }
  // Nell'agenda e nelle pendenze l'id ricordato non era il soggetto della
  // pagina: la lezione del calendario era quella del Registro, e le pendenze
  // filtravano con una scheda loro.
  if (pagina === 'pagina.calendario' || pagina === 'pagina.pendenze') return { pagina }
  for (const tipo of SOGGETTI[pagina]) {
    const scelto = ids[tipo]
    if (scelto) return { pagina, soggetto: { tipo, id: scelto } }
  }
  return { pagina }
}

// ------------------------------------------------------------------ regole

/**
 * Le letture del registro che servono ai ripieghi: le stesse di `state.ts`
 * (`corsoAperto`, `classiDellAnno`…), col registro e il periodo per parametro.
 */
class Letture {
  readonly anno: AnnoScolastico | null
  readonly semestre: Semestre | null
  readonly corsiDellAnno: Corso[]
  readonly classiDellAnno: Classe[]

  constructor (readonly registro: Registro, semestreId: string | null, readonly oggi: Iso) {
    this.anno = annoInUso(registro)
    this.semestre = this.anno && semestreId
      ? this.anno.semestri.find((s) => s.id === semestreId) ?? null
      : null
    this.corsiDellAnno = corsiDellAnno(registro, this.anno?.id ?? null)
      .sort((a, b) => confrontaNomi(a.titolo, b.titolo))
    // Archiviate in fondo: la pagina Classi le mostra, ma dopo.
    this.classiDellAnno = registro.classi
      .filter((c) => !this.anno || c.annoId === this.anno.id)
      .sort((a, b) => Number(a.archiviata) - Number(b.archiviata) || confrontaNomi(a.nome, b.nome))
  }

  corso (corsoId: string | null | undefined): Corso | null {
    return this.corsiDellAnno.find((c) => c.id === corsoId) ?? null
  }

  /** I corsi con almeno un'ora nel semestre, più quelli senza nessuna ora. */
  corsiNelSemestre (): Corso[] {
    const semestre = this.semestre
    if (!semestre) return this.corsiDellAnno
    const conOre = new Set<string>()
    const nelPeriodo = new Set<string>()
    for (const l of this.registro.lezioni) {
      conOre.add(l.corsoId)
      if (l.data >= semestre.inizio && l.data <= semestre.fine) nelPeriodo.add(l.corsoId)
    }
    return this.corsiDellAnno.filter((c) => !conOre.has(c.id) || nelPeriodo.has(c.id))
  }

  /**
   * Il corso scelto se è dell'anno, anche con le ore tutte nell'altro
   * semestre; se no il primo con ore nel semestre, poi il primo dell'anno.
   */
  corsoAperto (...scelti: Array<string | null | undefined>): Corso | null {
    for (const scelto of scelti) {
      const corso = this.corso(scelto)
      if (corso) return corso
    }
    return this.corsiNelSemestre()[0] ?? this.corsiDellAnno[0] ?? null
  }

  /** Un'ora di un corso dell'anno: quelle di un anno chiuso valgono come sparite. */
  lezione (lezioneId: string): Lezione | null {
    const lezione = this.registro.lezioni.find((l) => l.id === lezioneId)
    return lezione && this.corso(lezione.corsoId) ? lezione : null
  }

  /**
   * L'ora su cui si apre il Registro di un corso: nel semestre scelto (se lì
   * ce n'è) l'ultima passata, o la prima che verrà.
   */
  lezioneDiRiferimento (corsoId: string): string | null {
    const tutte = registroDelCorso(this.registro, corsoId)
    const semestre = this.semestre
    const nelPeriodo = semestre
      ? tutte.filter((l) => l.data >= semestre.inizio && l.data <= semestre.fine)
      : tutte
    const lezioni = nelPeriodo.length > 0 ? nelPeriodo : tutte
    const passate = lezioni.filter((l) => l.data <= this.oggi)
    return (passate[passate.length - 1] ?? lezioni[0])?.id ?? null
  }

  /** La classe della pagina Classi: quella scelta se è dell'anno, se no la prima. */
  classeDellaPaginaClassi (...scelte: Array<string | null | undefined>): Classe | null {
    for (const scelta of scelte) {
      const classe = this.classiDellAnno.find((c) => c.id === scelta)
      if (classe) return classe
    }
    return this.classiDellAnno[0] ?? null
  }

  /** Le classi dell'anno, non archiviate, di cui si è docente di classe. */
  docenze (): Classe[] {
    return this.classiDellAnno.filter((c) => !c.archiviata && c.docenteDiClasse)
  }

  /** La classe del fascicolo: quella scelta se lo è ancora, se no la prima. */
  classeDelFascicolo (...scelte: Array<string | null | undefined>): Classe | null {
    const docenze = this.docenze()
    for (const scelta of scelte) {
      const classe = docenze.find((c) => c.id === scelta)
      if (classe) return classe
    }
    return docenze[0] ?? null
  }

  /**
   * La classe di una persona: quella dichiarata se la contiene, se no la si
   * cerca fra tutte. Solo fra le classi dell'anno: una persona dell'anno
   * scorso non si apre dall'anno di adesso.
   */
  classeDellAllievo (allievoId: string, dichiarataId: string | null): Classe | null {
    const contiene = (c: Classe) => c.allievi.some((a) => a.id === allievoId)
    const dichiarata = this.classiDellAnno.find((c) => c.id === dichiarataId)
    return dichiarata && contiene(dichiarata)
      ? dichiarata
      : this.classiDellAnno.find(contiene) ?? null
  }
}

/**
 * Il giorno da guardare in un anno: quello chiesto se ci cade, se no oggi se
 * ci cade, se no il capo dell'anno più vicino (`giornoDentroLAnno` in `state.ts`).
 */
function giornoNellAnno (data: Iso, anno: AnnoScolastico | null, oggi: Iso): Iso {
  if (!anno || !isoValida(anno.inizio) || !isoValida(anno.fine)) return data
  if (anno.inizio > anno.fine) return data
  const dentro = (giorno: Iso): boolean => giorno >= anno.inizio && giorno <= anno.fine
  if (dentro(data)) return data
  if (dentro(oggi)) return oggi
  return data < anno.inizio ? anno.inizio : anno.fine
}

interface Completato {
  posto: Posto;
  contesto: Contesto;
  /** I campi di prima che dicono la pagina (`derivaVista` del posto completato). */
  derivati: CampiVista;
  /** Solo le preferenze del documento che cambiano: giorno, semestre, filtro dell'agenda. */
  preferenzeDoc: PreferenzeDoc;
  /** Se il posto chiesto non c'era e se ne è preso un altro (pagina o soggetto). */
  ripiegato: boolean;
}

/**
 * Il posto chiesto reso vero sul registro: il soggetto che manca si prende
 * dal contesto, quello sparito (o di un altro anno) si sostituisce col ripiego
 * del suo tipo, e il contesto e le preferenze seguono il soggetto (un'ora
 * porta corso, filtro, giorno e semestre). Non scrive niente: restituisce.
 */
export function completa (
  chiesto: Posto,
  contesto: Contesto,
  registro: Registro,
  oggi: Iso,
  preferenze: PreferenzeDoc = {},
): Completato {
  const r = registro
  const leggi = new Letture(r, preferenze.semestreId ?? null, oggi)
  const anno = leggi.anno
  const c: Contesto = { ...contesto }
  const pref: PreferenzeDoc = {}

  // Gli id ricordati che il documento non ha più si scordano: `null` è «niente scelto».
  const esiste = <T extends { id: string }>(voci: T[], v: string | null) =>
    v !== null && voci.some((x) => x.id === v) ? v : null
  c.corsoId = esiste(r.corsi, c.corsoId)
  c.classeId = esiste(r.classi, c.classeId)
  c.filtroClasseId = esiste(r.classi, c.filtroClasseId)
  c.lezioneId = esiste(r.lezioni, c.lezioneId)
  c.pianoId = esiste(r.piani, c.pianoId)
  c.valutazioneId = esiste(r.valutazioni, c.valutazioneId)
  c.allievoId = c.allievoId && r.classi.some((k) => k.allievi.some((a) => a.id === c.allievoId))
    ? c.allievoId
    : null
  // Il filtro dell'agenda su un corso sparito si spegne (`riconvalidaRicordati`).
  const filtroAgenda = preferenze.filtroCorsoAgendaId
  if (filtroAgenda && !r.corsi.some((k) => k.id === filtroAgenda)) {
    pref.filtroCorsoAgendaId = null
  }

  /** Il corso di lavoro, e la sua classe come filtro delle pagine di corso. */
  const alCorso = (corso: Corso) => {
    c.corsoId = corso.id
    if (r.classi.some((k) => k.id === corso.classeId)) c.filtroClasseId = corso.classeId
  }
  const allaClasse = (classe: Classe) => {
    c.classeId = classe.id
    c.filtroClasseId = classe.id
  }
  /** Il giorno di un'ora e il suo semestre; fuori da un semestre il periodo resta quello scelto. */
  const alGiorno = (data: Iso) => {
    pref.giorno = giornoNellAnno(data, anno, oggi)
    alSemestre(data)
  }
  const alSemestre = (data: Iso) => {
    const semestre = anno ? semestreDi(anno, data) : null
    if (semestre && semestre.id !== (preferenze.semestreId ?? null)) pref.semestreId = semestre.id
  }
  /** Senza corsi le pagine di corso non hanno niente: l'elenco dei corsi, o la Dashboard senza anno. */
  const senzaCorso = (): Posto => ({ pagina: anno ? 'pagina.corsi' : 'pagina.oggi' })

  let pagina: PaginaId = paginaValida(chiesto.pagina) ? chiesto.pagina : 'pagina.oggi'
  let ripiegato = pagina !== chiesto.pagina
  // Un soggetto di un tipo che la pagina non mostra non è un ripiego: si lascia.
  let soggetto = chiesto.soggetto && SOGGETTI[pagina].includes(chiesto.soggetto.tipo)
    ? chiesto.soggetto
    : undefined
  const scheda = pagina === 'pagina.impostazioni' ? schedaValida(chiesto.scheda) : undefined

  /** Da qui in poi ogni cambio di pagina o soggetto è un ripiego. */
  const ripiega = (posto: Posto) => {
    ripiegato = true
    pagina = posto.pagina
    soggetto = posto.soggetto
  }

  /**
   * Il Registro è di un'ora: chiederlo per un corso vuol dire la sua ora di
   * riferimento (non è un ripiego); se il corso non ne ha, i suoi piani (`scegliCorso`).
   */
  const alRegistroDi = (corso: Corso) => {
    const lezioneId = leggi.lezioneDiRiferimento(corso.id)
    if (lezioneId) soggetto = { tipo: 'lezione', id: lezioneId }
    else ripiega({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'corso', id: corso.id } })
  }

  // Un ripiego può portare su un'altra pagina con regole sue (Registro → piani
  // → corsi): si rifà finché il posto sta fermo. La catena più lunga fa tre giri.
  for (let giro = 0; giro < 5; giro++) {
    const prima = `${pagina}|${soggetto?.tipo ?? ''}:${soggetto?.id ?? ''}`
    switch (soggetto?.tipo) {
      case 'lezione': {
        const lezione = leggi.lezione(soggetto.id)
        if (lezione) {
          c.lezioneId = lezione.id
          alGiorno(lezione.data)
          if (pagina === 'pagina.calendario') {
            // Il calendario ha un filtro suo: se è di un altro corso l'ora
            // sarebbe nascosta, quindi si sposta sul suo (non si spegne). Il
            // corso di lavoro resta dov'è.
            const filtro = pref.filtroCorsoAgendaId !== undefined
              ? pref.filtroCorsoAgendaId
              : preferenze.filtroCorsoAgendaId ?? null
            if (filtro && filtro !== lezione.corsoId) pref.filtroCorsoAgendaId = lezione.corsoId
          } else {
            const corso = leggi.corso(lezione.corsoId)
            if (corso) alCorso(corso)
          }
          break
        }
        if (c.lezioneId === soggetto.id) c.lezioneId = null
        if (pagina === 'pagina.calendario') {
          ripiega({ pagina })
          break
        }
        // Nel Registro: l'ora di riferimento del corso di lavoro.
        ripiega({ pagina, soggetto: { tipo: 'corso', id: c.corsoId ?? '' } })
        break
      }
      case 'piano':
      case 'valutazione': {
        const trovato = soggetto.tipo === 'piano'
          ? r.piani.find((p) => p.id === soggetto?.id)
          : r.valutazioni.find((v) => v.id === soggetto?.id)
        // Un piano senza corso (di biblioteca) resta aperto; con un corso,
        // quel corso dev'essere dell'anno.
        const corso = trovato?.corsoId ? leggi.corso(trovato.corsoId) : null
        if (trovato && (corso || !trovato.corsoId)) {
          if (corso) alCorso(corso)
          if (soggetto.tipo === 'piano') c.pianoId = trovato.id
          else {
            c.valutazioneId = trovato.id
            // Il semestre, non il giorno: la pagina nasconde le prove degli altri periodi.
            if ('data' in trovato) alSemestre(trovato.data)
          }
          break
        }
        if (soggetto.tipo === 'piano' && c.pianoId === soggetto.id) c.pianoId = null
        if (soggetto.tipo === 'valutazione' && c.valutazioneId === soggetto.id) c.valutazioneId = null
        // La stessa pagina, sul corso di lavoro.
        ripiega({ pagina, soggetto: { tipo: 'corso', id: c.corsoId ?? '' } })
        break
      }
      case 'allievo': {
        const classe = leggi.classeDellAllievo(soggetto.id, c.classeId)
        if (classe) {
          c.allievoId = soggetto.id
          allaClasse(classe)
          break
        }
        if (c.allievoId === soggetto.id) c.allievoId = null
        const scelta = leggi.classiDellAnno.find((k) => k.id === c.classeId)
        ripiega(scelta
          ? { pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: scelta.id } }
          : { pagina: 'pagina.persone' })
        break
      }
      case 'corso': {
        const corso = diCorso(pagina)
          ? leggi.corsoAperto(soggetto.id, c.corsoId)
          : leggi.corso(soggetto.id)
        if (!corso) {
          // Le pagine che non chiedono un corso restano, senza soggetto.
          ripiega(diCorso(pagina) ? senzaCorso() : { pagina })
          break
        }
        if (corso.id !== soggetto.id) ripiega({ pagina, soggetto: { tipo: 'corso', id: corso.id } })
        alCorso(corso)
        if (pagina === 'pagina.corso.registro') alRegistroDi(corso)
        break
      }
      case 'classe': {
        let classe: Classe | null
        if (diClasse(pagina)) {
          classe = leggi.classeDelFascicolo(soggetto.id, c.classeId)
          if (!classe) {
            // Senza docenze la sezione non c'è (`riconvalidaRicordati`).
            ripiega(anno ? { pagina: 'pagina.classi', soggetto } : { pagina: 'pagina.oggi' })
            break
          }
        } else if (pagina === 'pagina.classi') {
          classe = leggi.classeDellaPaginaClassi(soggetto.id, c.classeId)
          if (!classe) {
            ripiega({ pagina })
            break
          }
        } else {
          classe = leggi.classiDellAnno.find((k) => k.id === soggetto?.id) ?? null
          if (!classe) {
            ripiega({ pagina })
            break
          }
        }
        if (classe.id !== soggetto.id) ripiega({ pagina, soggetto: { tipo: 'classe', id: classe.id } })
        allaClasse(classe)
        break
      }
      case undefined: {
        // Le pagine che mostrano un soggetto lo prendono dal contesto.
        if (diCorso(pagina)) {
          const corso = leggi.corsoAperto(c.corsoId)
          if (!corso) ripiega(senzaCorso())
          else if (pagina === 'pagina.corso.registro') alRegistroDi(corso)
          // Non un ripiego: la pagina chiesta senza soggetto è quella del corso di lavoro.
          else soggetto = { tipo: 'corso', id: corso.id }
        } else if (diClasse(pagina)) {
          const classe = leggi.classeDelFascicolo(c.classeId)
          if (!classe) ripiega(anno ? { pagina: 'pagina.classi' } : { pagina: 'pagina.oggi' })
          else soggetto = { tipo: 'classe', id: classe.id }
        } else if (pagina === 'pagina.classi') {
          const classe = leggi.classeDellaPaginaClassi(c.classeId)
          if (classe) soggetto = { tipo: 'classe', id: classe.id }
        } else if (pagina === 'pagina.allievo') {
          soggetto = { tipo: 'allievo', id: c.allievoId ?? '' }
        }
        break
      }
    }
    if (`${pagina}|${soggetto?.tipo ?? ''}:${soggetto?.id ?? ''}` === prima) break
  }

  const posto: Posto = { pagina }
  if (soggetto) posto.soggetto = soggetto
  if (scheda && pagina === 'pagina.impostazioni') posto.scheda = scheda
  return { posto, contesto: c, derivati: derivaVista(posto), preferenzeDoc: pref, ripiegato }
}

/**
 * La chiave del posto: `pagina|tipo:id|scheda`. Con `'pagina'` senza soggetto,
 * per chi distingue solo le pagine (l'entrata animata). L'id è codificato,
 * così un id con dentro `|` o `:` non si confonde con un altro posto.
 */
export function chiaveDelPosto (posto: Posto, livello: 'soggetto' | 'pagina' = 'soggetto'): string {
  const soggetto = livello === 'soggetto' && posto.soggetto
    ? `${posto.soggetto.tipo}:${encodeURIComponent(posto.soggetto.id)}`
    : ''
  return [posto.pagina, soggetto, posto.scheda ?? ''].join('|')
}
